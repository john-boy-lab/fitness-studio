import { describe, it, expect } from 'vitest';
import {
  lbsToKg,
  kgToLbs,
  inchesToCm,
  cmToInches,
  calculateAge,
  calculateBMR,
  calculateTDEE,
  calculateMacros,
  calculateTargetCalories,
  calculateAllMetrics,
  ACTIVITY_MULTIPLIERS,
  MACRO_SPLITS,
  CALORIES_PER_GRAM,
} from './index';

describe('Unit Conversions', () => {
  describe('lbsToKg', () => {
    it('converts pounds to kilograms correctly', () => {
      expect(lbsToKg(220.462)).toBeCloseTo(100, 1);
      expect(lbsToKg(150)).toBeCloseTo(68.04, 1);
      expect(lbsToKg(0)).toBe(0);
    });
  });

  describe('kgToLbs', () => {
    it('converts kilograms to pounds correctly', () => {
      expect(kgToLbs(100)).toBeCloseTo(220.462, 1);
      expect(kgToLbs(70)).toBeCloseTo(154.32, 1);
      expect(kgToLbs(0)).toBe(0);
    });
  });

  describe('inchesToCm', () => {
    it('converts inches to centimeters correctly', () => {
      expect(inchesToCm(70)).toBeCloseTo(177.8, 1);
      expect(inchesToCm(12)).toBeCloseTo(30.48, 1);
      expect(inchesToCm(0)).toBe(0);
    });
  });

  describe('cmToInches', () => {
    it('converts centimeters to inches correctly', () => {
      expect(cmToInches(177.8)).toBeCloseTo(70, 1);
      expect(cmToInches(30.48)).toBeCloseTo(12, 1);
      expect(cmToInches(0)).toBe(0);
    });
  });
});

describe('calculateAge', () => {
  it('calculates age correctly from string date', () => {
    // Mock current date by using a fixed reference
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 30);
    const dateStr = birthDate.toISOString().split('T')[0] ?? '';
    const age = calculateAge(dateStr);
    expect(age).toBe(30);
  });

  it('calculates age correctly from Date object', () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 25);
    expect(calculateAge(birthDate)).toBe(25);
  });

  it('handles birthday not yet reached this year', () => {
    const today = new Date();
    const birthDate = new Date(today.getFullYear() - 30, today.getMonth() + 1, 15);
    // Birthday is next month, so should be 29 not 30
    expect(calculateAge(birthDate)).toBe(29);
  });
});

describe('calculateBMR', () => {
  // Reference values based on Mifflin-St Jeor equation
  // Male, 180 lbs, 70 inches, 30 years
  // kg = 81.65, cm = 177.8
  // BMR = (10 × 81.65) + (6.25 × 177.8) – (5 × 30) + 5 = 816.5 + 1111.25 - 150 + 5 = 1783

  it('calculates BMR for males correctly', () => {
    const bmr = calculateBMR(180, 70, 30, 'male');
    // Allow some tolerance for rounding
    expect(bmr).toBeGreaterThan(1700);
    expect(bmr).toBeLessThan(1850);
  });

  it('calculates BMR for females correctly', () => {
    // Female BMR is 166 less than male
    const maleBmr = calculateBMR(180, 70, 30, 'male');
    const femaleBmr = calculateBMR(180, 70, 30, 'female');
    expect(femaleBmr).toBeLessThan(maleBmr);
    expect(maleBmr - femaleBmr).toBeCloseTo(166, 0);
  });

  it('calculates BMR for other sex as average', () => {
    const maleBmr = calculateBMR(180, 70, 30, 'male');
    const femaleBmr = calculateBMR(180, 70, 30, 'female');
    const otherBmr = calculateBMR(180, 70, 30, 'other');

    const average = (maleBmr + femaleBmr) / 2;
    expect(otherBmr).toBeCloseTo(average, 0);
  });

  it('returns integer values', () => {
    const bmr = calculateBMR(175, 68, 25, 'male');
    expect(Number.isInteger(bmr)).toBe(true);
  });
});

describe('calculateTDEE', () => {
  const baseBmr = 1800;

  it('applies sedentary multiplier correctly', () => {
    const tdee = calculateTDEE(baseBmr, 'sedentary');
    expect(tdee).toBe(Math.round(baseBmr * ACTIVITY_MULTIPLIERS.sedentary));
  });

  it('applies light activity multiplier correctly', () => {
    const tdee = calculateTDEE(baseBmr, 'light');
    expect(tdee).toBe(Math.round(baseBmr * ACTIVITY_MULTIPLIERS.light));
  });

  it('applies moderate activity multiplier correctly', () => {
    const tdee = calculateTDEE(baseBmr, 'moderate');
    expect(tdee).toBe(Math.round(baseBmr * ACTIVITY_MULTIPLIERS.moderate));
  });

  it('applies active multiplier correctly', () => {
    const tdee = calculateTDEE(baseBmr, 'active');
    expect(tdee).toBe(Math.round(baseBmr * ACTIVITY_MULTIPLIERS.active));
  });

  it('applies very_active multiplier correctly', () => {
    const tdee = calculateTDEE(baseBmr, 'very_active');
    expect(tdee).toBe(Math.round(baseBmr * ACTIVITY_MULTIPLIERS.very_active));
  });

  it('returns integer values', () => {
    const tdee = calculateTDEE(1783, 'moderate');
    expect(Number.isInteger(tdee)).toBe(true);
  });
});

describe('calculateTargetCalories', () => {
  const tdee = 2500;

  it('returns TDEE for maintain goal', () => {
    expect(calculateTargetCalories(tdee, 'maintain')).toBe(tdee);
  });

  it('creates deficit for lose goal', () => {
    const target = calculateTargetCalories(tdee, 'lose', 1);
    // 1 lb/week = 3500/7 = 500 cal/day deficit
    expect(target).toBe(tdee - 500);
  });

  it('creates surplus for gain goal', () => {
    const target = calculateTargetCalories(tdee, 'gain', 1);
    // 1 lb/week = 3500/7 = 500 cal/day surplus
    expect(target).toBe(tdee + 500);
  });

  it('adjusts for 0.5 lb/week rate', () => {
    const target = calculateTargetCalories(tdee, 'lose', 0.5);
    // 0.5 lb/week = 1750/7 = 250 cal/day
    expect(target).toBe(tdee - 250);
  });
});

describe('calculateMacros', () => {
  const tdee = 2500;

  it('calculates macros for lose goal correctly', () => {
    const macros = calculateMacros({ tdee, goalType: 'lose', weeklyRateLbs: 1 });

    // Target calories = 2500 - 500 = 2000
    expect(macros.calories).toBe(2000);

    // Lose split: 40% protein, 30% carbs, 30% fat
    const expectedProtein = Math.round((2000 * 0.40) / CALORIES_PER_GRAM.protein);
    const expectedCarbs = Math.round((2000 * 0.30) / CALORIES_PER_GRAM.carbs);
    const expectedFat = Math.round((2000 * 0.30) / CALORIES_PER_GRAM.fat);

    expect(macros.protein_g).toBe(expectedProtein);
    expect(macros.carbs_g).toBe(expectedCarbs);
    expect(macros.fat_g).toBe(expectedFat);
  });

  it('calculates macros for maintain goal correctly', () => {
    const macros = calculateMacros({ tdee, goalType: 'maintain' });

    expect(macros.calories).toBe(tdee);

    // Maintain split: 30% protein, 40% carbs, 30% fat
    const expectedProtein = Math.round((tdee * 0.30) / CALORIES_PER_GRAM.protein);
    const expectedCarbs = Math.round((tdee * 0.40) / CALORIES_PER_GRAM.carbs);
    const expectedFat = Math.round((tdee * 0.30) / CALORIES_PER_GRAM.fat);

    expect(macros.protein_g).toBe(expectedProtein);
    expect(macros.carbs_g).toBe(expectedCarbs);
    expect(macros.fat_g).toBe(expectedFat);
  });

  it('calculates macros for gain goal correctly', () => {
    const macros = calculateMacros({ tdee, goalType: 'gain', weeklyRateLbs: 1 });

    // Target calories = 2500 + 500 = 3000
    expect(macros.calories).toBe(3000);

    // Gain split: 30% protein, 45% carbs, 25% fat
    const expectedProtein = Math.round((3000 * 0.30) / CALORIES_PER_GRAM.protein);
    const expectedCarbs = Math.round((3000 * 0.45) / CALORIES_PER_GRAM.carbs);
    const expectedFat = Math.round((3000 * 0.25) / CALORIES_PER_GRAM.fat);

    expect(macros.protein_g).toBe(expectedProtein);
    expect(macros.carbs_g).toBe(expectedCarbs);
    expect(macros.fat_g).toBe(expectedFat);
  });

  it('returns integer values for grams', () => {
    const macros = calculateMacros({ tdee, goalType: 'maintain' });
    expect(Number.isInteger(macros.protein_g)).toBe(true);
    expect(Number.isInteger(macros.carbs_g)).toBe(true);
    expect(Number.isInteger(macros.fat_g)).toBe(true);
  });
});

describe('calculateAllMetrics', () => {
  it('calculates all metrics together', () => {
    const result = calculateAllMetrics({
      weightLbs: 180,
      heightInches: 70,
      birthDate: '1994-01-15', // ~31 years old
      sex: 'male',
      activityLevel: 'moderate',
      goalType: 'lose',
      weeklyRateLbs: 1,
    });

    // BMR should be reasonable for this profile
    expect(result.bmr).toBeGreaterThan(1600);
    expect(result.bmr).toBeLessThan(1900);

    // TDEE = BMR * 1.55 (moderate)
    expect(result.tdee).toBe(Math.round(result.bmr * ACTIVITY_MULTIPLIERS.moderate));

    // Macros should have reasonable values
    expect(result.macros.calories).toBeLessThan(result.tdee); // Should be deficit for lose
    expect(result.macros.protein_g).toBeGreaterThan(100); // Reasonable protein
    expect(result.macros.carbs_g).toBeGreaterThan(50);
    expect(result.macros.fat_g).toBeGreaterThan(30);
  });
});

describe('Constants', () => {
  it('has correct activity multipliers', () => {
    expect(ACTIVITY_MULTIPLIERS.sedentary).toBe(1.2);
    expect(ACTIVITY_MULTIPLIERS.light).toBe(1.375);
    expect(ACTIVITY_MULTIPLIERS.moderate).toBe(1.55);
    expect(ACTIVITY_MULTIPLIERS.active).toBe(1.725);
    expect(ACTIVITY_MULTIPLIERS.very_active).toBe(1.9);
  });

  it('has correct macro splits', () => {
    expect(MACRO_SPLITS.lose).toEqual({ protein: 0.40, carbs: 0.30, fat: 0.30 });
    expect(MACRO_SPLITS.maintain).toEqual({ protein: 0.30, carbs: 0.40, fat: 0.30 });
    expect(MACRO_SPLITS.gain).toEqual({ protein: 0.30, carbs: 0.45, fat: 0.25 });
  });

  it('has correct calories per gram', () => {
    expect(CALORIES_PER_GRAM.protein).toBe(4);
    expect(CALORIES_PER_GRAM.carbs).toBe(4);
    expect(CALORIES_PER_GRAM.fat).toBe(9);
  });
});
