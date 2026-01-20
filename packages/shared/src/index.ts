// Export types (core type definitions)
export * from './types';

// Export validation schemas
// Note: Some validation exports may re-define types inferred from schemas
// Use the type definitions from ./types for consistency
export {
  // Zod schemas
  sexSchema,
  activityLevelSchema,
  goalSchema,
  syncStatusSchema,
  pictureTypeSchema,
  reviewStatusSchema,
  macrosSchema,
  userFitnessProfileSchema,
  createUserFitnessProfileSchema,
  updateUserFitnessProfileSchema,
  weightEntrySchema,
  createWeightEntrySchema,
  updateWeightEntrySchema,
  foodEntrySchema,
  createPictureSchema,
  updatePictureSchema,
  // Inferred input types from schemas
  type MacrosInput,
  type UserFitnessProfileInput,
  type WeightEntryInput,
  type FoodEntryInput,
  type PictureInput,
  // Food-specific schemas
  foodNutrientsSchema,
  foodSearchResultSchema,
  foodEntryQuerySchema,
  dailyMacroTargetsSchema,
  type FoodNutrientsInput,
  type FoodSearchResultInput,
  type FoodEntryQueryInput,
  type DailyMacroTargetsInput,
} from './validation';

// Export utilities (functions and constants)
// Note: Exclude Sex and ActivityLevel types to avoid conflicts with ./types
export {
  // Unit conversions
  lbsToKg,
  kgToLbs,
  inchesToCm,
  cmToInches,
  inchesToFeetAndInches,
  feetAndInchesToInches,
  // Calculations
  calculateAge,
  calculateBMR,
  calculateTDEE,
  calculateMacros,
  calculateTargetCalories,
  calculateAllMetrics,
  // Constants
  ACTIVITY_MULTIPLIERS,
  activityMultipliers,
  MACRO_SPLITS,
  CALORIES_PER_GRAM,
  // Utility functions
  generateUUID,
  toLocalISOString,
  // Types (prefixed to avoid conflicts)
  type GoalType,
  type WeeklyRate,
  type MacroTargets,
  type CalculateMacrosInput,
  type CalculateAllMetricsInput,
  type FitnessMetrics,
} from './utils';
