import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Get environment variables from Expo config
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or anon key not configured. Check your environment variables.');
}

/**
 * Expo SecureStore adapter for Supabase auth persistence
 * Uses secure storage on native and localStorage on web
 */
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      // SecureStore doesn't work on web, fall back to localStorage
      if (typeof window !== 'undefined' && !('expo' in window)) {
        return localStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error getting item from SecureStore:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && !('expo' in window)) {
        localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Error setting item in SecureStore:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && !('expo' in window)) {
        localStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error removing item from SecureStore:', error);
    }
  },
};

/**
 * Supabase client instance
 * Configured with secure storage for auth tokens
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Database types for TypeScript support
 * These types can be auto-generated from your Supabase schema
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          google_refresh_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          google_refresh_token?: string | null;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          google_refresh_token?: string | null;
        };
      };
      user_fitness_profile: {
        Row: {
          id: string;
          user_id: string;
          height_inches: number;
          birth_date: string;
          sex: 'male' | 'female' | 'other';
          activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
          goal_type: 'lose' | 'maintain' | 'gain' | null;
          target_weight_lbs: number | null;
          weekly_rate_lbs: number | null;
          calculated_bmr: number | null;
          calculated_tdee: number | null;
          calculated_macros: {
            calories: number;
            protein_g: number;
            carbs_g: number;
            fat_g: number;
          } | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          height_inches: number;
          birth_date: string;
          sex: 'male' | 'female' | 'other';
          activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
          goal_type?: 'lose' | 'maintain' | 'gain' | null;
          target_weight_lbs?: number | null;
          weekly_rate_lbs?: number | null;
          calculated_bmr?: number | null;
          calculated_tdee?: number | null;
          calculated_macros?: {
            calories: number;
            protein_g: number;
            carbs_g: number;
            fat_g: number;
          } | null;
        };
        Update: Partial<Database['public']['Tables']['user_fitness_profile']['Insert']>;
      };
      weight_entries: {
        Row: {
          id: string;
          user_id: string;
          weight_lbs: number;
          recorded_at: string;
          picture_id: string | null;
          notes: string | null;
          local_id: string | null;
          sync_status: 'pending' | 'synced' | 'conflict';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          weight_lbs: number;
          recorded_at?: string;
          picture_id?: string | null;
          notes?: string | null;
          local_id?: string | null;
          sync_status?: 'pending' | 'synced' | 'conflict';
        };
        Update: Partial<Database['public']['Tables']['weight_entries']['Insert']>;
      };
    };
  };
}

export default supabase;
