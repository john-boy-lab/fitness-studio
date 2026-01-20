import { z } from 'zod';

// Enums
export const sexSchema = z.enum(['male', 'female', 'other']);
export const activityLevelSchema = z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active']);
export const goalSchema = z.enum(['lose_weight', 'maintain_weight', 'gain_weight', 'build_muscle']);
export const syncStatusSchema = z.enum(['pending', 'synced', 'conflict']);
export const pictureTypeSchema = z.enum(['weight', 'food', 'progress', 'other']);
export const reviewStatusSchema = z.enum(['pending', 'approved', 'rejected', 'skipped']);

// Macros
export const macrosSchema = z.object({
  calories: z.number().min(0),
  protein_g: z.number().min(0),
  carbs_g: z.number().min(0),
  fat_g: z.number().min(0),
  fiber_g: z.number().min(0).optional(),
});

// User Fitness Profile
export const userFitnessProfileSchema = z.object({
  height_inches: z.number().min(36).max(96), // 3ft to 8ft
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sex: sexSchema,
  activity_level: activityLevelSchema,
  goals: z.array(goalSchema).min(1),
});

export const createUserFitnessProfileSchema = userFitnessProfileSchema;
export const updateUserFitnessProfileSchema = userFitnessProfileSchema.partial();

// Weight Entry
export const weightEntrySchema = z.object({
  weight_lbs: z.number().min(50).max(1000),
  recorded_at: z.string().datetime(),
  picture_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const createWeightEntrySchema = weightEntrySchema;
export const updateWeightEntrySchema = weightEntrySchema.partial();

// Food Entry
export const foodEntrySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).nullable().optional(),
  calories: z.number().min(0),
  protein_g: z.number().min(0),
  carbs_g: z.number().min(0),
  fat_g: z.number().min(0),
  fiber_g: z.number().min(0).nullable().optional(),
  serving_size: z.number().min(0),
  serving_unit: z.string().min(1).max(50),
  servings: z.number().min(0),
  consumed_at: z.string().datetime(),
  meal_type: z.string().max(50).nullable().optional(),
  picture_id: z.string().uuid().nullable().optional(),
  external_food_id: z.string().max(100).nullable().optional(),
  external_source: z.string().max(50).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const createFoodEntrySchema = foodEntrySchema;
export const updateFoodEntrySchema = foodEntrySchema.partial();

// Re-export food-specific schemas
export * from './food.schema';

// Re-export profile schemas
export * from './profile.schema';

// Picture
export const pictureSchema = z.object({
  storage_path: z.string().min(1),
  filename: z.string().min(1),
  mime_type: z.string().min(1),
  size_bytes: z.number().min(0).nullable().optional(),
  width: z.number().min(0).nullable().optional(),
  height: z.number().min(0).nullable().optional(),
  picture_type: pictureTypeSchema,
});

export const createPictureSchema = pictureSchema;
export const updatePictureSchema = pictureSchema.partial().extend({
  is_reviewed: z.boolean().optional(),
  review_status: reviewStatusSchema.optional(),
});

// Type exports for inference
export type MacrosInput = z.infer<typeof macrosSchema>;
export type UserFitnessProfileInput = z.infer<typeof userFitnessProfileSchema>;
export type WeightEntryInput = z.infer<typeof weightEntrySchema>;
export type FoodEntryInput = z.infer<typeof foodEntrySchema>;
export type PictureInput = z.infer<typeof pictureSchema>;
