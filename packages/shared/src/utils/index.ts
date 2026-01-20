// ============================================
// Unit Conversions
// ============================================

/**
 * Convert weight from lbs to kg
 * Formula: lbs / 2.20462
 */
export function lbsToKg(lbs: number): number {
  return lbs / 2.20462;
}

/**
 * Convert weight from kg to lbs
 * Formula: kg * 2.20462
 */
export function kgToLbs(kg: number): number {
  return kg * 2.20462;
}

/**
 * Convert height from inches to cm
 * Formula: inches * 2.54
 */
export function inchesToCm(inches: number): number {
  return inches * 2.54;
}

/**
 * Convert height from cm to inches
 * Formula: cm / 2.54
 */
export function cmToInches(cm: number): number {
  return cm / 2.54;
}

/**
 * Convert height from inches to feet and inches
 */
export function inchesToFeetAndInches(inches: number): { feet: number; inches: number } {
  return {
    feet: Math.floor(inches / 12),
    inches: inches % 12,
  };
}

/**
 * Convert height from feet and inches to total inches
 */
export function feetAndInchesToInches(feet: number, inches: number): number {
  return feet * 12 + inches;
}

// ============================================
// Age Calculation
// ============================================

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: string | Date): number {
  const today = new Date();
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

// ============================================
// BMR Calculation (Mifflin-St Jeor Equation)
// ============================================

export type Sex = 'male' | 'female' | 'other';

/**
 * Calculate BMR using Mifflin-St Jeor equation
 *
 * Males: BMR = (10 x weight[kg]) + (6.25 x height[cm]) - (5 x age) + 5
 * Females: BMR = (10 x weight[kg]) + (6.25 x height[cm]) - (5 x age) - 161
 *
 * @param weightLbs - Weight in pounds
 * @param heightInches - Height in inches
 * @param ageYears - Age in years
 * @param sex - Biological sex for calculation
 * @returns BMR in calories/day
 */
export function calculateBMR(
  weightLbs: number,
  heightInches: number,
  ageYears: number,
  sex: Sex
): number {
  const weightKg = lbsToKg(weightLbs);
  const heightCm = inchesToCm(heightInches);

  // Mifflin-St Jeor equation base
  const baseBMR = (10 * weightKg) + (6.25 * heightCm) - (5 * ageYears);

  if (sex === 'male') {
    return Math.round(baseBMR + 5);
  } else if (sex === 'female') {
    return Math.round(baseBMR - 161);
  }
  // For 'other', use average of male and female adjustment
  return Math.round(baseBMR - 78);
}

// ============================================
// TDEE Calculation
// ============================================

/**
 * Activity level type for TDEE calculation
 */
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

/**
 * Activity multipliers for TDEE calculation
 */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,      // Little to no exercise
  light: 1.375,        // Light exercise 1-3 days/week
  moderate: 1.55,      // Moderate exercise 3-5 days/week
  active: 1.725,       // Heavy exercise 6-7 days/week
  very_active: 1.9,    // Very heavy exercise, physical job
} as const;

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 *
 * TDEE = BMR x activity_multiplier
 *
 * @param bmr - Basal Metabolic Rate
 * @param activityLevel - Activity level
 * @returns TDEE in calories/day
 */
export function calculateTDEE(
  bmr: number,
  activityLevel: ActivityLevel
): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

// ============================================
// Macro Calculation
// ============================================

export type GoalType = 'lose' | 'maintain' | 'gain';

/**
 * Macro split ratios by goal type
 * Format: { protein, carbs, fat } as decimal percentages
 */
export const MACRO_SPLITS: Record<GoalType, { protein: number; carbs: number; fat: number }> = {
  lose: { protein: 0.40, carbs: 0.30, fat: 0.30 },     // 40% protein, 30% carbs, 30% fat
  maintain: { protein: 0.30, carbs: 0.40, fat: 0.30 }, // 30% protein, 40% carbs, 30% fat
  gain: { protein: 0.30, carbs: 0.45, fat: 0.25 },     // 30% protein, 45% carbs, 25% fat
} as const;

/**
 * Calories per gram for each macro
 */
export const CALORIES_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
} as const;

/**
 * Weekly weight change rate options in lbs
 */
export type WeeklyRate = 0.5 | 1 | 1.5 | 2;

/**
 * Caloric deficit/surplus per lb of weight change
 * 1 lb of fat = ~3500 calories
 */
const CALORIES_PER_LB = 3500;

export interface MacroTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface CalculateMacrosInput {
  tdee: number;
  goalType: GoalType;
  weeklyRateLbs?: WeeklyRate;
}

/**
 * Calculate daily calorie target based on goal
 *
 * @param tdee - Total Daily Energy Expenditure
 * @param goalType - Goal type (lose/maintain/gain)
 * @param weeklyRateLbs - Target weight change per week in lbs (default: 1)
 * @returns Target daily calories
 */
export function calculateTargetCalories(
  tdee: number,
  goalType: GoalType,
  weeklyRateLbs: WeeklyRate = 1
): number {
  const dailyChange = (weeklyRateLbs * CALORIES_PER_LB) / 7;

  switch (goalType) {
    case 'lose':
      return Math.round(tdee - dailyChange);
    case 'gain':
      return Math.round(tdee + dailyChange);
    case 'maintain':
    default:
      return Math.round(tdee);
  }
}

/**
 * Calculate macro targets based on calories and goal
 *
 * Macro splits by goal:
 * - Lose: 40% protein, 30% carbs, 30% fat
 * - Maintain: 30% protein, 40% carbs, 30% fat
 * - Gain: 30% protein, 45% carbs, 25% fat
 *
 * Calories per gram: protein 4, carbs 4, fat 9
 *
 * @param input - Calculation input with TDEE, goal type, and optional weekly rate
 * @returns Macro targets including calories and grams for each macro
 */
export function calculateMacros(input: CalculateMacrosInput): MacroTargets {
  const { tdee, goalType, weeklyRateLbs = 1 } = input;

  const targetCalories = calculateTargetCalories(tdee, goalType, weeklyRateLbs);
  const splits = MACRO_SPLITS[goalType];

  return {
    calories: targetCalories,
    protein_g: Math.round((targetCalories * splits.protein) / CALORIES_PER_GRAM.protein),
    carbs_g: Math.round((targetCalories * splits.carbs) / CALORIES_PER_GRAM.carbs),
    fat_g: Math.round((targetCalories * splits.fat) / CALORIES_PER_GRAM.fat),
  };
}

/**
 * Calculate all fitness metrics in one call
 * Convenience function that calculates BMR, TDEE, and macros
 */
export interface CalculateAllMetricsInput {
  weightLbs: number;
  heightInches: number;
  birthDate: string | Date;
  sex: Sex;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  weeklyRateLbs?: WeeklyRate;
}

export interface FitnessMetrics {
  bmr: number;
  tdee: number;
  macros: MacroTargets;
}

export function calculateAllMetrics(input: CalculateAllMetricsInput): FitnessMetrics {
  const { weightLbs, heightInches, birthDate, sex, activityLevel, goalType, weeklyRateLbs } = input;

  const age = calculateAge(birthDate);
  const bmr = calculateBMR(weightLbs, heightInches, age, sex);
  const tdee = calculateTDEE(bmr, activityLevel);
  const macros = calculateMacros({ tdee, goalType, weeklyRateLbs });

  return { bmr, tdee, macros };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Format date to ISO string without timezone (YYYY-MM-DD)
 */
export function toLocalISOString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Legacy exports for backwards compatibility
export const activityMultipliers = ACTIVITY_MULTIPLIERS;
