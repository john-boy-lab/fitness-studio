import { create } from 'zustand';

type SyncState = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncStoreState {
  status: SyncState;
  lastSyncedAt: Date | null;
  pendingChanges: number;
  isOnline: boolean;

  // Actions
  setStatus: (status: SyncState) => void;
  setLastSyncedAt: (date: Date | null) => void;
  setPendingChanges: (count: number) => void;
  setOnline: (online: boolean) => void;
  triggerSync: () => Promise<void>;
}

export const useSyncStore = create<SyncStoreState>((set, get) => ({
  status: 'idle',
  lastSyncedAt: null,
  pendingChanges: 0,
  isOnline: true,

  setStatus: (status) => set({ status }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setPendingChanges: (pendingChanges) => set({ pendingChanges }),
  setOnline: (isOnline) => set({ isOnline }),

  triggerSync: async () => {
    const { isOnline, status } = get();

    if (!isOnline || status === 'syncing') {
      return;
    }

    set({ status: 'syncing' });

    try {
      // TODO: Implement sync logic with sync engine
      console.log('Sync triggered - to be implemented');
      set({ status: 'idle', lastSyncedAt: new Date() });
    } catch (error) {
      console.error('Sync error:', error);
      set({ status: 'error' });
    }
  },
}));
