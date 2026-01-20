import { useEffect, useCallback } from 'react';
import { useSyncStore } from '../store/sync.store';

/**
 * Hook for managing sync state and triggering synchronization
 */
export function useSync() {
  const { status, lastSyncedAt, pendingChanges, isOnline, triggerSync, setOnline } = useSyncStore();

  // Monitor network status
  useEffect(() => {
    // TODO: Use NetInfo to monitor network connectivity
    // For now, assume online
    setOnline(true);
  }, [setOnline]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingChanges > 0) {
      triggerSync();
    }
  }, [isOnline, pendingChanges, triggerSync]);

  const forceSync = useCallback(async () => {
    await triggerSync();
  }, [triggerSync]);

  return {
    status,
    lastSyncedAt,
    pendingChanges,
    isOnline,
    isSyncing: status === 'syncing',
    hasError: status === 'error',
    forceSync,
  };
}
