/**
 * Food validation schemas using Zod
 */

import { z } from 'zod';

/**
 * Food nutrients schema
 */
export const foodNutrientsSchema = z.object({
  calories: z.number().min(0, 'Calories must be non-negative'),
  protein: z.number().min(0, 'Protein must be non-negative'),
  carbs: z.number().min(0, 'Carbs must be non-negative'),
  fat: z.number().min(0, 'Fat must be non-negative'),
  fiber: z.number().min(0, 'Fiber must be non-negative').optional(),
});

/**
 * Food search result schema
 */
export const foodSearchResultSchema = z.object({
  fdcId: z.string().min(1, 'FDC ID is required'),
  description: z.string().min(1, 'Description is required'),
  brandName: z.string().optional(),
  brandOwner: z.string().optional(),
  servingSize: z.number().positive().optional(),
  servingSizeUnit: z.string().optional(),
  nutrients: foodNutrientsSchema,
});

/**
 * Create food entry input schema
 */
export const createFoodEntrySchema = z.object({
  name: z.string().min(1, 'Food name is required').max(200, 'Food name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  calories: z.number().min(0, 'Calories must be non-negative'),
  protein_g: z.number().min(0, 'Protein must be non-negative'),
  carbs_g: z.number().min(0, 'Carbs must be non-negative'),
  fat_g: z.number().min(0, 'Fat must be non-negative'),
  fiber_g: z.number().min(0, 'Fiber must be non-negative').optional(),
  serving_size: z.number().positive('Serving size must be positive'),
  serving_unit: z.string().min(1, 'Serving unit is required').max(50),
  servings: z.number().positive('Servings must be positive').default(1),
  consumed_at: z.string().datetime('Invalid date format'),
  meal_type: z.string().max(50).optional(),
  picture_id: z.string().uuid('Invalid picture ID').optional(),
  external_food_id: z.string().max(100).optional(),
  external_source: z.string().max(50).optional(),
  notes: z.string().max(500, 'Notes are too long').optional(),
});

/**
 * Update food entry input schema (partial of create)
 */
export const updateFoodEntrySchema = createFoodEntrySchema.partial().extend({
  id: z.string().uuid('Invalid food entry ID'),
});

/**
 * Food entry query params schema
 */
export const foodEntryQuerySchema = z.object({
  user_id: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  meal_type: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

/**
 * Daily macro targets schema
 */
export const dailyMacroTargetsSchema = z.object({
  calories: z.number().positive('Calories target must be positive'),
  protein_g: z.number().positive('Protein target must be positive'),
  carbs_g: z.number().positive('Carbs target must be positive'),
  fat_g: z.number().positive('Fat target must be positive'),
  fiber_g: z.number().positive('Fiber target must be positive').optional(),
});

// Type exports
export type FoodNutrientsInput = z.infer<typeof foodNutrientsSchema>;
export type FoodSearchResultInput = z.infer<typeof foodSearchResultSchema>;
export type CreateFoodEntryInput = z.infer<typeof createFoodEntrySchema>;
export type UpdateFoodEntryInput = z.infer<typeof updateFoodEntrySchema>;
export type FoodEntryQueryInput = z.infer<typeof foodEntryQuerySchema>;
export type DailyMacroTargetsInput = z.infer<typeof dailyMacroTargetsSchema>;
