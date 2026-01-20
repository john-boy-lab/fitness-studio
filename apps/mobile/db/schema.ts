import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// User fitness profile table
export const userFitnessProfiles = sqliteTable('user_fitness_profiles', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  height_inches: integer('height_inches').notNull(),
  birth_date: text('birth_date').notNull(),
  sex: text('sex', { enum: ['male', 'female', 'other'] }).notNull(),
  activity_level: text('activity_level', {
    enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active']
  }).notNull(),
  goals: text('goals').notNull(), // JSON array stored as text
  calculated_macros: text('calculated_macros'), // JSON stored as text
  local_id: text('local_id'),
  sync_status: text('sync_status', { enum: ['pending', 'synced', 'conflict'] }).notNull().default('pending'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// Weight entries table
export const weightEntries = sqliteTable('weight_entries', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  weight_lbs: real('weight_lbs').notNull(),
  recorded_at: text('recorded_at').notNull(),
  picture_id: text('picture_id').references(() => pictures.id),
  notes: text('notes'),
  local_id: text('local_id'),
  sync_status: text('sync_status', { enum: ['pending', 'synced', 'conflict'] }).notNull().default('pending'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// Food entries table
export const foodEntries = sqliteTable('food_entries', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  calories: real('calories').notNull(),
  protein_g: real('protein_g').notNull(),
  carbs_g: real('carbs_g').notNull(),
  fat_g: real('fat_g').notNull(),
  fiber_g: real('fiber_g'),
  serving_size: real('serving_size').notNull(),
  serving_unit: text('serving_unit').notNull(),
  servings: real('servings').notNull(),
  consumed_at: text('consumed_at').notNull(),
  meal_type: text('meal_type'),
  picture_id: text('picture_id').references(() => pictures.id),
  external_food_id: text('external_food_id'),
  external_source: text('external_source'), // 'usda', 'custom', etc.
  notes: text('notes'),
  local_id: text('local_id'),
  sync_status: text('sync_status', { enum: ['pending', 'synced', 'conflict'] }).notNull().default('pending'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// Pictures table with fitness extensions
export const pictures = sqliteTable('pictures', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  storage_path: text('storage_path').notNull(),
  filename: text('filename').notNull(),
  mime_type: text('mime_type').notNull(),
  size_bytes: integer('size_bytes'),
  width: integer('width'),
  height: integer('height'),
  picture_type: text('picture_type', { enum: ['weight', 'food', 'progress', 'other'] }).notNull(),
  is_reviewed: integer('is_reviewed', { mode: 'boolean' }).notNull().default(false),
  review_status: text('review_status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  exif_timestamp: text('exif_timestamp'),
  local_id: text('local_id'),
  sync_status: text('sync_status', { enum: ['pending', 'synced', 'conflict'] }).notNull().default('pending'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// Food search cache table for offline access
export const foodSearchCache = sqliteTable('food_search_cache', {
  id: text('id').primaryKey(),
  query: text('query').notNull(),
  results: text('results').notNull(), // JSON array of FoodSearchResult
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  expires_at: text('expires_at').notNull(),
});

// Food details cache table for offline access
export const foodDetailsCache = sqliteTable('food_details_cache', {
  fdc_id: text('fdc_id').primaryKey(),
  data: text('data').notNull(), // JSON FoodDetails object
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  expires_at: text('expires_at').notNull(),
});

// Type exports for use in application code
export type UserFitnessProfile = typeof userFitnessProfiles.$inferSelect;
export type NewUserFitnessProfile = typeof userFitnessProfiles.$inferInsert;
export type WeightEntry = typeof weightEntries.$inferSelect;
export type NewWeightEntry = typeof weightEntries.$inferInsert;
export type FoodEntry = typeof foodEntries.$inferSelect;
export type NewFoodEntry = typeof foodEntries.$inferInsert;
export type Picture = typeof pictures.$inferSelect;
export type NewPicture = typeof pictures.$inferInsert;
export type FoodSearchCacheEntry = typeof foodSearchCache.$inferSelect;
export type NewFoodSearchCacheEntry = typeof foodSearchCache.$inferInsert;
export type FoodDetailsCacheEntry = typeof foodDetailsCache.$inferSelect;
export type NewFoodDetailsCacheEntry = typeof foodDetailsCache.$inferInsert;
