// Fitness profile types
export type Sex = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
export type Goal = 'lose_weight' | 'maintain_weight' | 'gain_weight' | 'build_muscle';
export type SyncStatus = 'pending' | 'synced' | 'conflict';
export type PictureType = 'weight' | 'food' | 'progress' | 'other';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'skipped';

export interface Macros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
}

export interface UserFitnessProfile {
  id: string;
  user_id: string;
  height_inches: number;
  birth_date: string;
  sex: Sex;
  activity_level: ActivityLevel;
  goals: Goal[];
  calculated_macros: Macros | null;
  created_at: string;
  updated_at: string;
}

export interface WeightEntry {
  id: string;
  user_id: string;
  weight_lbs: number;
  recorded_at: string;
  picture_id: string | null;
  notes: string | null;
  local_id: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface FoodEntry {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  serving_size: number;
  serving_unit: string;
  servings: number;
  consumed_at: string;
  meal_type: string | null;
  picture_id: string | null;
  external_food_id: string | null;
  external_source: string | null;
  notes: string | null;
  local_id: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

// Export food-specific types (except those that conflict with validation exports)
export type {
  FoodNutrients,
  FoodSearchResult,
  FoodDetails,
  DailyMacroSummary,
  DailyMacroTargets,
  MealType,
} from './food';
export { MEAL_TYPES } from './food';

export interface Picture {
  id: string;
  user_id: string;
  storage_path: string;
  filename: string;
  mime_type: string;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  picture_type: PictureType;
  is_reviewed: boolean;
  review_status: ReviewStatus;
  local_id: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  google_refresh_token: string | null;
  created_at: string;
  updated_at: string;
}
