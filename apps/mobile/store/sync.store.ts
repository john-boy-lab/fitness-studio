/**
 * Sync Store
 * Zustand store for managing sync state
 */

import { create } from 'zustand';

type SyncState = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncStoreState {
  // State
  status: SyncState;
  lastSyncedAt: Date | null;
  pendingChanges: number;
  isOnline: boolean;
  lastError: string | null;

  // Actions
  setStatus: (status: SyncState) => void;
  setLastSyncedAt: (date: Date | null) => void;
  setPendingChanges: (count: number) => void;
  setOnline: (online: boolean) => void;
  setError: (error: string | null) => void;
  incrementPending: () => void;
  decrementPending: () => void;
  reset: () => void;
}

const initialState = {
  status: 'idle' as SyncState,
  lastSyncedAt: null,
  pendingChanges: 0,
  isOnline: true,
  lastError: null,
};

export const useSyncStore = create<SyncStoreState>((set, get) => ({
  ...initialState,

  setStatus: (status) => set({ status }),

  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),

  setPendingChanges: (pendingChanges) => set({ pendingChanges }),

  setOnline: (isOnline) => {
    set({ isOnline });
    // Auto-set status to offline when network is unavailable
    if (!isOnline) {
      set({ status: 'offline' });
    }
  },

  setError: (lastError) => set({ lastError, status: lastError ? 'error' : 'idle' }),

  incrementPending: () => set((state) => ({ pendingChanges: state.pendingChanges + 1 })),

  decrementPending: () =>
    set((state) => ({ pendingChanges: Math.max(0, state.pendingChanges - 1) })),

  reset: () => set(initialState),
}));

// Selectors
export const selectSyncStatus = (state: SyncStoreState) => state.status;
export const selectIsOnline = (state: SyncStoreState) => state.isOnline;
export const selectPendingChanges = (state: SyncStoreState) => state.pendingChanges;
export const selectLastSyncedAt = (state: SyncStoreState) => state.lastSyncedAt;
export const selectHasPendingChanges = (state: SyncStoreState) => state.pendingChanges > 0;
export const selectIsSyncing = (state: SyncStoreState) => state.status === 'syncing';
