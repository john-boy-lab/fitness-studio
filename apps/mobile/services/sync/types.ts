/**
 * Sync Engine Types
 * Types and interfaces for the offline sync system
 */

export type SyncStatus = 'pending' | 'synced' | 'conflict';
export type SyncState = 'idle' | 'syncing' | 'error' | 'offline';
export type MutationType = 'insert' | 'update' | 'delete';

/**
 * Represents a table that can be synced
 */
export type SyncableTable =
  | 'weight_entries'
  | 'food_entries'
  | 'pictures'
  | 'user_fitness_profiles';

/**
 * A mutation queued for syncing
 */
export interface QueuedMutation {
  id: string;
  table: SyncableTable;
  type: MutationType;
  record_id: string;
  data: Record<string, unknown>;
  created_at: string;
  retry_count: number;
  last_error: string | null;
  status: 'pending' | 'processing' | 'failed';
}

/**
 * Sync state for a specific table
 */
export interface TableSyncState {
  table: SyncableTable;
  last_synced_at: string | null;
  pending_count: number;
}

/**
 * Overall sync status
 */
export interface SyncStatusInfo {
  state: SyncState;
  isOnline: boolean;
  lastSyncedAt: Date | null;
  pendingMutations: number;
  tables: TableSyncState[];
}

/**
 * Sync event types for subscribers
 */
export type SyncEventType =
  | 'sync_started'
  | 'sync_completed'
  | 'sync_error'
  | 'mutation_queued'
  | 'mutation_synced'
  | 'conflict_detected'
  | 'network_change';

export interface SyncEvent {
  type: SyncEventType;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export type SyncEventListener = (event: SyncEvent) => void;

/**
 * Configuration for the sync engine
 */
export interface SyncConfig {
  maxRetries: number;
  baseRetryDelay: number; // ms
  maxRetryDelay: number; // ms
  syncOnForeground: boolean;
  syncOnNetworkChange: boolean;
  batchSize: number;
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  maxRetries: 5,
  baseRetryDelay: 1000, // 1 second
  maxRetryDelay: 60000, // 60 seconds
  syncOnForeground: true,
  syncOnNetworkChange: true,
  batchSize: 50,
};
