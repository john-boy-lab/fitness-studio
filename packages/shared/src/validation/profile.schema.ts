import { z } from 'zod';

/**
 * Sex options for profile
 */
export const profileSexSchema = z.enum(['male', 'female', 'other']);
export type ProfileSex = z.infer<typeof profileSexSchema>;

/**
 * Activity level options matching the calculation engine
 */
export const profileActivityLevelSchema = z.enum([
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
]);
export type ProfileActivityLevel = z.infer<typeof profileActivityLevelSchema>;

/**
 * Goal type for weight management
 */
export const profileGoalTypeSchema = z.enum(['lose', 'maintain', 'gain']);
export type ProfileGoalType = z.infer<typeof profileGoalTypeSchema>;

/**
 * Weekly rate options for weight change (in lbs)
 */
export const profileWeeklyRateSchema = z.enum(['0.5', '1', '1.5', '2']);
export type ProfileWeeklyRate = z.infer<typeof profileWeeklyRateSchema>;

/**
 * Profile form schema for the profile screen
 * Used for React Hook Form validation
 */
export const profileFormSchema = z.object({
  // Height in total inches (e.g., 70 for 5'10")
  height_inches: z
    .number({
      required_error: 'Height is required',
      invalid_type_error: 'Height must be a number',
    })
    .min(36, 'Height must be at least 36 inches (3 feet)')
    .max(96, 'Height must be at most 96 inches (8 feet)'),

  // Birth date in YYYY-MM-DD format
  birth_date: z
    .string({
      required_error: 'Birth date is required',
    })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Birth date must be in YYYY-MM-DD format')
    .refine((date) => {
      const birthDate = new Date(date);
      const now = new Date();
      const age = now.getFullYear() - birthDate.getFullYear();
      return age >= 13 && age <= 120;
    }, 'You must be between 13 and 120 years old'),

  // Biological sex for BMR calculation
  sex: profileSexSchema,

  // Activity level for TDEE calculation
  activity_level: profileActivityLevelSchema,
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;

/**
 * Goals form schema for the goals screen
 */
export const goalsFormSchema = z.object({
  // Current weight (for display, may come from weight_entries)
  current_weight_lbs: z
    .number({
      required_error: 'Current weight is required',
      invalid_type_error: 'Current weight must be a number',
    })
    .min(50, 'Weight must be at least 50 lbs')
    .max(1000, 'Weight must be at most 1000 lbs')
    .optional(),

  // Target weight
  target_weight_lbs: z
    .number({
      required_error: 'Target weight is required',
      invalid_type_error: 'Target weight must be a number',
    })
    .min(50, 'Target weight must be at least 50 lbs')
    .max(1000, 'Target weight must be at most 1000 lbs'),

  // Goal type
  goal_type: profileGoalTypeSchema,

  // Weekly rate of change
  weekly_rate_lbs: z
    .number({
      required_error: 'Rate is required',
    })
    .refine((val) => [0.5, 1, 1.5, 2].includes(val), {
      message: 'Rate must be 0.5, 1, 1.5, or 2 lbs per week',
    }),
});

export type GoalsFormData = z.infer<typeof goalsFormSchema>;

/**
 * Combined profile and goals for full fitness profile
 */
export const fullFitnessProfileSchema = profileFormSchema.merge(goalsFormSchema);
export type FullFitnessProfile = z.infer<typeof fullFitnessProfileSchema>;

/**
 * Activity level display labels
 */
export const ACTIVITY_LEVEL_LABELS: Record<ProfileActivityLevel, string> = {
  sedentary: 'Sedentary (little to no exercise)',
  light: 'Light (1-3 days/week)',
  moderate: 'Moderate (3-5 days/week)',
  active: 'Active (6-7 days/week)',
  very_active: 'Very Active (physical job or 2x/day)',
};

/**
 * Goal type display labels
 */
export const GOAL_TYPE_LABELS: Record<ProfileGoalType, string> = {
  lose: 'Lose Weight',
  maintain: 'Maintain Weight',
  gain: 'Gain Weight',
};

/**
 * Weekly rate display labels
 */
export const WEEKLY_RATE_LABELS: Record<string, string> = {
  '0.5': '0.5 lb/week (slower, more sustainable)',
  '1': '1 lb/week (recommended)',
  '1.5': '1.5 lbs/week (moderate)',
  '2': '2 lbs/week (aggressive)',
};
