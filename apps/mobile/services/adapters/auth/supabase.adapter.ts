import { SupabaseClient, User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { AuthAdapter, AuthUser } from './index';

// Allow WebBrowser to complete auth flow
WebBrowser.maybeCompleteAuthSession();

export class SupabaseAuthAdapter implements AuthAdapter {
  private supabase: SupabaseClient;

  // Google OAuth scopes for Calendar and Tasks APIs
  private static readonly GOOGLE_SCOPES = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/tasks',
  ].join(' ');

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  async signInWithGoogle(): Promise<AuthUser> {
    // Get the redirect URL for the app
    const redirectUrl = Linking.createURL('auth/callback');

    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: SupabaseAuthAdapter.GOOGLE_SCOPES,
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      throw new Error(`Google sign-in failed: ${error.message}`);
    }

    if (!data?.url) {
      throw new Error('No authentication URL returned');
    }

    // Open the browser for OAuth flow
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    if (result.type === 'success') {
      // Extract the URL and parse the session
      const url = result.url;
      const params = new URL(url).hash.substring(1);
      const searchParams = new URLSearchParams(params);

      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');

      if (accessToken && refreshToken) {
        // Set the session with the tokens
        const { error: sessionError } = await this.supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          throw new Error(`Failed to set session: ${sessionError.message}`);
        }
      }
    } else if (result.type === 'cancel') {
      throw new Error('Authentication was cancelled');
    }

    // Get the user after OAuth
    const user = await this.getUser();
    if (!user) {
      throw new Error('Failed to get user after sign-in');
    }

    return user;
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw new Error(`Sign-out failed: ${error.message}`);
    }
  }

  async getUser(): Promise<AuthUser | null> {
    const { data, error } = await this.supabase.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return this.mapSupabaseUser(data.user);
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    const { data } = this.supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          callback(this.mapSupabaseUser(session.user));
        } else {
          callback(null);
        }
      }
    );

    return () => {
      data.subscription.unsubscribe();
    };
  }

  async getAccessToken(): Promise<string | null> {
    const { data, error } = await this.supabase.auth.getSession();

    if (error || !data.session) {
      return null;
    }

    return data.session.access_token;
  }

  async getGoogleAccessToken(): Promise<string | null> {
    const { data, error } = await this.supabase.auth.getSession();

    if (error || !data.session) {
      return null;
    }

    // The provider_token contains the Google access token
    return data.session.provider_token || null;
  }

  private mapSupabaseUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email || '',
      displayName: user.user_metadata?.full_name,
      avatarUrl: user.user_metadata?.avatar_url,
    };
  }
}
