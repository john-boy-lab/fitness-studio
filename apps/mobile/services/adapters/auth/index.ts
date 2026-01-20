// Auth adapter interface
export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface AuthAdapter {
  signInWithGoogle(): Promise<AuthUser>;
  signOut(): Promise<void>;
  getUser(): Promise<AuthUser | null>;
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
  getAccessToken(): Promise<string | null>;
  getGoogleAccessToken(): Promise<string | null>;
}

export { SupabaseAuthAdapter } from './supabase.adapter';
