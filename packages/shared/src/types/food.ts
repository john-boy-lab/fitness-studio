/**
 * Food-related types for the fitness-studio application
 */

import type { SyncStatus } from './index';

/**
 * Nutrient information for a food item
 */
export interface FoodNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

/**
 * Food search result from external API (USDA)
 */
export interface FoodSearchResult {
  fdcId: string;
  description: string;
  brandName?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  nutrients: FoodNutrients;
}

/**
 * Detailed food information from external API
 */
export interface FoodDetails extends FoodSearchResult {
  ingredients?: string;
  dataType: string;
  foodCategory?: string;
  householdServingFullText?: string;
}

/**
 * Food entry stored in the database
 */
export interface FoodEntry {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number | null;
  serving_size: number;
  serving_unit: string;
  servings: number;
  consumed_at: string;
  meal_type?: string | null;
  picture_id?: string | null;
  external_food_id?: string | null;
  external_source?: string | null;
  notes?: string | null;
  local_id?: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new food entry
 */
export interface CreateFoodEntryInput {
  name: string;
  description?: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  serving_size: number;
  serving_unit: string;
  servings: number;
  consumed_at: string;
  meal_type?: string;
  picture_id?: string;
  external_food_id?: string;
  external_source?: string;
  notes?: string;
}

/**
 * Input for updating a food entry
 */
export interface UpdateFoodEntryInput extends Partial<CreateFoodEntryInput> {
  id: string;
}

/**
 * Daily macro totals summary
 */
export interface DailyMacroSummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  entryCount: number;
}

/**
 * User's daily macro targets
 */
export interface DailyMacroTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
}

/**
 * Meal types for categorizing food entries
 */
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';

/**
 * Get meal type options for UI
 */
export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
  { value: 'other', label: 'Other' },
];
