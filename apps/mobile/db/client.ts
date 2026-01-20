import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

// Open database
const expo = openDatabaseSync('fitness-studio.db');

// Create drizzle client with schema
export const db = drizzle(expo, { schema });

// Initialize database with tables
export async function initializeDatabase(): Promise<void> {
  await expo.execAsync(`
    CREATE TABLE IF NOT EXISTS user_fitness_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      height_inches INTEGER NOT NULL,
      birth_date TEXT NOT NULL,
      sex TEXT NOT NULL CHECK(sex IN ('male', 'female', 'other')),
      activity_level TEXT NOT NULL CHECK(activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active')),
      goals TEXT NOT NULL,
      calculated_macros TEXT,
      local_id TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'conflict')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pictures (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER,
      width INTEGER,
      height INTEGER,
      picture_type TEXT NOT NULL CHECK(picture_type IN ('weight', 'food', 'progress', 'other')),
      is_reviewed INTEGER NOT NULL DEFAULT 0,
      review_status TEXT NOT NULL DEFAULT 'pending' CHECK(review_status IN ('pending', 'approved', 'rejected', 'skipped')),
      exif_timestamp TEXT,
      local_id TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'conflict')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS weight_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      weight_lbs REAL NOT NULL,
      recorded_at TEXT NOT NULL,
      picture_id TEXT REFERENCES pictures(id),
      notes TEXT,
      local_id TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'conflict')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS food_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      calories REAL NOT NULL,
      protein_g REAL NOT NULL,
      carbs_g REAL NOT NULL,
      fat_g REAL NOT NULL,
      fiber_g REAL,
      serving_size REAL NOT NULL,
      serving_unit TEXT NOT NULL,
      servings REAL NOT NULL,
      consumed_at TEXT NOT NULL,
      meal_type TEXT,
      picture_id TEXT REFERENCES pictures(id),
      external_food_id TEXT,
      external_source TEXT,
      notes TEXT,
      local_id TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'conflict')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS food_search_cache (
      id TEXT PRIMARY KEY,
      query TEXT NOT NULL,
      results TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS food_details_cache (
      fdc_id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_weight_entries_user_id ON weight_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_weight_entries_recorded_at ON weight_entries(recorded_at DESC);
    CREATE INDEX IF NOT EXISTS idx_food_entries_user_id ON food_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_food_entries_consumed_at ON food_entries(consumed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_pictures_user_id ON pictures(user_id);
    CREATE INDEX IF NOT EXISTS idx_pictures_picture_type ON pictures(picture_type);
    CREATE INDEX IF NOT EXISTS idx_pictures_is_reviewed ON pictures(is_reviewed);
    CREATE INDEX IF NOT EXISTS idx_food_search_cache_query ON food_search_cache(query);
  `);
}

export { schema };

// Helper function to generate UUIDs
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Helper function to get current ISO timestamp
export function nowISO(): string {
  return new Date().toISOString();
}
