import { useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';

/**
 * Hook for managing authentication state
 */
export function useAuth() {
  const { user, isLoading, error, signInWithGoogle, signOut, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Initialize auth state on mount
    // TODO: Check for existing session with Supabase
    const initAuth = async () => {
      try {
        // Simulate checking for existing session
        setLoading(false);
      } catch (err) {
        console.error('Auth initialization error:', err);
        setLoading(false);
      }
    };

    initAuth();
  }, [setLoading]);

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    signInWithGoogle,
    signOut,
  };
}
