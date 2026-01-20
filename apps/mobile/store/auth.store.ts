import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { SupabaseAuthAdapter, AuthUser } from '../services/adapters/auth';

// Create auth adapter instance
const authAdapter = new SupabaseAuthAdapter(supabase);

// Re-export AuthUser type for convenience
export type { AuthUser };

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  initialize: async () => {
    if (get().isInitialized) return;

    try {
      // Get current user
      const user = await authAdapter.getUser();
      set({ user, isLoading: false, isInitialized: true });

      // Subscribe to auth state changes
      authAdapter.onAuthStateChange((user) => {
        set({ user, isLoading: false });
      });
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ isLoading: false, isInitialized: true, error: (error as Error).message });
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await authAdapter.signInWithGoogle();
      set({ user, isLoading: false });
    } catch (error) {
      const errorMessage = (error as Error).message;
      // Don't set error for cancellation
      if (!errorMessage.includes('cancelled')) {
        set({ error: errorMessage });
      }
      set({ isLoading: false });
      throw error;
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      await authAdapter.signOut();
      set({ user: null, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },
}));

// Export the auth adapter for direct access if needed
export { authAdapter };
