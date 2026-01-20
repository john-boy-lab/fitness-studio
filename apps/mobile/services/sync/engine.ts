/**
 * Sync Engine
 * Main coordinator for offline sync operations
 */

import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../supabase';
import { db, nowISO } from '../../db/client';
import { eq } from 'drizzle-orm';
import {
  weightEntries,
  foodEntries,
  pictures,
  userFitnessProfiles,
} from '../../db/schema';
import {
  SyncState,
  SyncConfig,
  SyncEvent,
  SyncEventListener,
  SyncEventType,
  SyncableTable,
  DEFAULT_SYNC_CONFIG,
  QueuedMutation,
} from './types';
import {
  getPendingMutations,
  getNextBatch,
  markMutationProcessing,
  completeMutation,
  failMutation,
  getMutationCount,
} from './queue';
import { useSyncStore } from '../../store/sync.store';

// Singleton instance
let syncEngineInstance: SyncEngine | null = null;

/**
 * Sync Engine class
 * Coordinates sync operations between local SQLite and Supabase
 */
export class SyncEngine {
  private config: SyncConfig;
  private state: SyncState = 'idle';
  private isOnline: boolean = true;
  private lastSyncedAt: Date | null = null;
  private listeners: SyncEventListener[] = [];
  private syncInProgress: boolean = false;
  private appStateSubscription: { remove: () => void } | null = null;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
  }

  /**
   * Initialize the sync engine
   */
  async initialize(): Promise<void> {
    // Subscribe to app state changes
    if (this.config.syncOnForeground) {
      this.appStateSubscription = AppState.addEventListener(
        'change',
        this.handleAppStateChange.bind(this)
      );
    }

    // Initial sync attempt
    await this.sync();

    this.emit('sync_started', { source: 'initialization' });
  }

  /**
   * Cleanup the sync engine
   */
  destroy(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.listeners = [];
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'active' && this.config.syncOnForeground) {
      this.sync();
    }
  }

  /**
   * Set online status
   */
  setOnline(online: boolean): void {
    const wasOffline = !this.isOnline;
    this.isOnline = online;

    this.emit('network_change', { isOnline: online });
    useSyncStore.getState().setOnline(online);

    // Trigger sync when coming back online
    if (online && wasOffline && this.config.syncOnNetworkChange) {
      this.sync();
    }

    if (!online) {
      this.state = 'offline';
      useSyncStore.getState().setStatus('offline');
    }
  }

  /**
   * Main sync method
   */
  async sync(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    this.state = 'syncing';
    useSyncStore.getState().setStatus('syncing');
    this.emit('sync_started', {});

    try {
      // 1. Push local changes to remote
      await this.pushChanges();

      // 2. Pull remote changes
      await this.pullChanges();

      // Update state
      this.lastSyncedAt = new Date();
      this.state = 'idle';
      useSyncStore.getState().setStatus('idle');
      useSyncStore.getState().setLastSyncedAt(this.lastSyncedAt);
      useSyncStore.getState().setPendingChanges(getMutationCount());

      this.emit('sync_completed', { timestamp: this.lastSyncedAt });
    } catch (error) {
      console.error('Sync error:', error);
      this.state = 'error';
      useSyncStore.getState().setStatus('error');
      this.emit('sync_error', { error: (error as Error).message });
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Push local mutations to remote
   */
  private async pushChanges(): Promise<void> {
    const batch = getNextBatch(this.config.batchSize);

    for (const mutation of batch) {
      try {
        markMutationProcessing(mutation.id);
        await this.processMutation(mutation);
        completeMutation(mutation.id);
        this.emit('mutation_synced', { mutation });
      } catch (error) {
        failMutation(mutation.id, (error as Error).message);
        console.error('Failed to sync mutation:', error);
      }
    }
  }

  /**
   * Process a single mutation
   */
  private async processMutation(mutation: QueuedMutation): Promise<void> {
    const { table, type, record_id, data } = mutation;

    switch (type) {
      case 'insert':
        await this.pushInsert(table, record_id, data);
        break;
      case 'update':
        await this.pushUpdate(table, record_id, data);
        break;
      case 'delete':
        await this.pushDelete(table, record_id);
        break;
    }
  }

  /**
   * Push insert to remote
   */
  private async pushInsert(
    table: SyncableTable,
    recordId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const { error } = await supabase.from(table).insert({
      ...data,
      id: recordId,
      sync_status: 'synced',
    });

    if (error) {
      throw new Error(`Insert failed: ${error.message}`);
    }

    // Update local record sync status
    await this.updateLocalSyncStatus(table, recordId, 'synced');
  }

  /**
   * Push update to remote
   */
  private async pushUpdate(
    table: SyncableTable,
    recordId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    // Check for conflicts using timestamp
    const { data: remoteRecord, error: fetchError } = await supabase
      .from(table)
      .select('updated_at')
      .eq('id', recordId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error(`Fetch failed: ${fetchError.message}`);
    }

    // If remote record exists and was updated after our change, we have a conflict
    if (remoteRecord && data.updated_at) {
      const remoteTime = new Date(remoteRecord.updated_at as string).getTime();
      const localTime = new Date(data.updated_at as string).getTime();

      if (remoteTime > localTime) {
        // Conflict - remote wins (last-write-wins strategy)
        this.emit('conflict_detected', {
          table,
          recordId,
          resolution: 'remote_wins',
        });
        // Mark local as conflict for user review
        await this.updateLocalSyncStatus(table, recordId, 'conflict');
        return;
      }
    }

    // Push update to remote
    const { error } = await supabase
      .from(table)
      .update({
        ...data,
        sync_status: 'synced',
        updated_at: nowISO(),
      })
      .eq('id', recordId);

    if (error) {
      throw new Error(`Update failed: ${error.message}`);
    }

    await this.updateLocalSyncStatus(table, recordId, 'synced');
  }

  /**
   * Push delete to remote
   */
  private async pushDelete(table: SyncableTable, recordId: string): Promise<void> {
    const { error } = await supabase.from(table).delete().eq('id', recordId);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Update local record sync status
   */
  private async updateLocalSyncStatus(
    table: SyncableTable,
    recordId: string,
    status: 'pending' | 'synced' | 'conflict'
  ): Promise<void> {
    const schemaTable = this.getSchemaTable(table);
    if (schemaTable) {
      await db
        .update(schemaTable)
        .set({ sync_status: status, updated_at: nowISO() })
        .where(eq(schemaTable.id, recordId));
    }
  }

  /**
   * Get drizzle schema table by name
   */
  private getSchemaTable(table: SyncableTable) {
    switch (table) {
      case 'weight_entries':
        return weightEntries;
      case 'food_entries':
        return foodEntries;
      case 'pictures':
        return pictures;
      case 'user_fitness_profiles':
        return userFitnessProfiles;
      default:
        return null;
    }
  }

  /**
   * Pull changes from remote
   */
  private async pullChanges(): Promise<void> {
    const tables: SyncableTable[] = [
      'weight_entries',
      'food_entries',
      'pictures',
      'user_fitness_profiles',
    ];

    for (const table of tables) {
      await this.pullTableChanges(table);
    }
  }

  /**
   * Pull changes for a specific table
   */
  private async pullTableChanges(table: SyncableTable): Promise<void> {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return;

    const userId = session.session.user.id;
    const sinceDate = this.lastSyncedAt?.toISOString() || '1970-01-01T00:00:00Z';

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', sinceDate);

    if (error) {
      console.error(`Failed to pull ${table}:`, error);
      return;
    }

    if (data && data.length > 0) {
      await this.mergeRemoteRecords(table, data);
    }
  }

  /**
   * Merge remote records into local database
   */
  private async mergeRemoteRecords(
    table: SyncableTable,
    records: Record<string, unknown>[]
  ): Promise<void> {
    const schemaTable = this.getSchemaTable(table);
    if (!schemaTable) return;

    for (const record of records) {
      const recordId = record.id as string;

      // Check if we have a local version
      const localRecords = await db
        .select()
        .from(schemaTable)
        .where(eq(schemaTable.id, recordId));

      const localRecord = localRecords[0];

      if (!localRecord) {
        // Insert new record
        await db.insert(schemaTable).values({
          ...record,
          sync_status: 'synced',
        } as typeof schemaTable.$inferInsert);
      } else if (localRecord.sync_status === 'pending') {
        // Local has pending changes - check for conflict
        const remoteTime = new Date(record.updated_at as string).getTime();
        const localTime = new Date(localRecord.updated_at).getTime();

        if (remoteTime > localTime) {
          // Remote is newer - update local and mark synced
          await db
            .update(schemaTable)
            .set({ ...record, sync_status: 'synced' } as typeof schemaTable.$inferInsert)
            .where(eq(schemaTable.id, recordId));
        }
        // Otherwise keep local pending changes
      } else {
        // No local changes - update with remote
        await db
          .update(schemaTable)
          .set({ ...record, sync_status: 'synced' } as typeof schemaTable.$inferInsert)
          .where(eq(schemaTable.id, recordId));
      }
    }
  }

  /**
   * Subscribe to sync events
   */
  subscribe(listener: SyncEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Emit a sync event
   */
  private emit(type: SyncEventType, data?: Record<string, unknown>): void {
    const event: SyncEvent = {
      type,
      timestamp: new Date(),
      data,
    };
    this.listeners.forEach((listener) => listener(event));
  }

  /**
   * Get current sync status
   */
  getStatus(): {
    state: SyncState;
    isOnline: boolean;
    lastSyncedAt: Date | null;
    pendingCount: number;
  } {
    return {
      state: this.state,
      isOnline: this.isOnline,
      lastSyncedAt: this.lastSyncedAt,
      pendingCount: getMutationCount(),
    };
  }
}

/**
 * Get or create the sync engine singleton
 */
export function getSyncEngine(config?: Partial<SyncConfig>): SyncEngine {
  if (!syncEngineInstance) {
    syncEngineInstance = new SyncEngine(config);
  }
  return syncEngineInstance;
}

/**
 * Initialize the sync engine
 */
export async function initializeSyncEngine(
  config?: Partial<SyncConfig>
): Promise<SyncEngine> {
  const engine = getSyncEngine(config);
  await engine.initialize();
  return engine;
}

/**
 * Destroy the sync engine singleton
 */
export function destroySyncEngine(): void {
  if (syncEngineInstance) {
    syncEngineInstance.destroy();
    syncEngineInstance = null;
  }
}
