/**
 * useSync Hook
 * Provides sync operations and state for components
 */

import { useCallback, useEffect, useState } from 'react';
import { useSyncStore } from '../store/sync.store';
import {
  getSyncEngine,
  initializeSyncEngine,
  initializeNetworkMonitoring,
  subscribeToNetworkChanges,
  subscribeToQueue,
  getMutationCount,
  isOnline as checkIsOnline,
  SyncEvent,
  SyncEventListener,
} from '../services/sync';

/**
 * Hook for accessing sync state and triggering sync operations
 */
export function useSync() {
  const {
    status,
    lastSyncedAt,
    pendingChanges,
    isOnline,
    lastError,
  } = useSyncStore();

  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize sync engine on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initializeNetworkMonitoring();
        await initializeSyncEngine();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize sync:', error);
      }
    };

    init();
  }, []);

  // Subscribe to queue changes
  useEffect(() => {
    const unsubscribe = subscribeToQueue((queue) => {
      useSyncStore.getState().setPendingChanges(queue.filter((m) => m.status === 'pending').length);
    });

    return unsubscribe;
  }, []);

  // Subscribe to network changes
  useEffect(() => {
    const unsubscribe = subscribeToNetworkChanges((state) => {
      useSyncStore.getState().setOnline(state === 'online');
    });

    return unsubscribe;
  }, []);

  /**
   * Trigger a manual sync
   */
  const triggerSync = useCallback(async () => {
    if (!isOnline) {
      console.log('Cannot sync while offline');
      return;
    }

    const engine = getSyncEngine();
    await engine.sync();
  }, [isOnline]);

  /**
   * Subscribe to sync events
   */
  const subscribeSyncEvents = useCallback((listener: SyncEventListener) => {
    const engine = getSyncEngine();
    return engine.subscribe(listener);
  }, []);

  /**
   * Get formatted last sync time
   */
  const getLastSyncText = useCallback(() => {
    if (!lastSyncedAt) return 'Never synced';

    const now = new Date();
    const diffMs = now.getTime() - lastSyncedAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return lastSyncedAt.toLocaleDateString();
  }, [lastSyncedAt]);

  return {
    // State
    status,
    lastSyncedAt,
    pendingChanges,
    isOnline,
    lastError,
    isInitialized,
    isSyncing: status === 'syncing',
    hasError: status === 'error',
    isOffline: status === 'offline',
    hasPendingChanges: pendingChanges > 0,

    // Actions
    triggerSync,
    forceSync: triggerSync, // Alias for backwards compatibility
    subscribeSyncEvents,

    // Utilities
    getLastSyncText,
  };
}

/**
 * Hook for sync status indicator
 */
export function useSyncIndicator() {
  const { status, pendingChanges, isOnline } = useSync();

  const getStatusColor = useCallback(() => {
    switch (status) {
      case 'syncing':
        return '$blue10';
      case 'error':
        return '$red10';
      case 'offline':
        return '$gray10';
      default:
        return pendingChanges > 0 ? '$yellow10' : '$green10';
    }
  }, [status, pendingChanges]);

  const getStatusText = useCallback(() => {
    switch (status) {
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return 'Sync error';
      case 'offline':
        return 'Offline';
      default:
        return pendingChanges > 0 ? `${pendingChanges} pending` : 'Synced';
    }
  }, [status, pendingChanges]);

  return {
    status,
    isOnline,
    pendingChanges,
    statusColor: getStatusColor(),
    statusText: getStatusText(),
  };
}
