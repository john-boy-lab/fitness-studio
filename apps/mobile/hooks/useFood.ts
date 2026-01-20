/**
 * useFood Hook
 * Provides food entry CRUD operations with local SQLite storage
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { db, generateId, nowISO } from '../db/client';
import { foodEntries, type FoodEntry, type NewFoodEntry } from '../db/schema';
import { useAuthStore } from '../store/auth.store';

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
 * Daily macro summary
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

// Query keys
const FOOD_QUERY_KEYS = {
  all: ['food'] as const,
  entries: () => [...FOOD_QUERY_KEYS.all, 'entries'] as const,
  entriesByDate: (date: string) => [...FOOD_QUERY_KEYS.entries(), date] as const,
  entry: (id: string) => [...FOOD_QUERY_KEYS.entries(), id] as const,
  dailySummary: (date: string) => [...FOOD_QUERY_KEYS.all, 'summary', date] as const,
};

/**
 * Get start and end of day in ISO format
 */
function getDayBounds(date: Date): { startOfDay: string; endOfDay: string } {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return {
    startOfDay: startOfDay.toISOString(),
    endOfDay: endOfDay.toISOString(),
  };
}

/**
 * Hook for food entry operations
 */
export function useFood() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  /**
   * Fetch food entries for a specific date
   */
  const useFoodEntriesByDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    const { startOfDay, endOfDay } = getDayBounds(date);

    return useQuery({
      queryKey: FOOD_QUERY_KEYS.entriesByDate(dateString),
      queryFn: async (): Promise<FoodEntry[]> => {
        if (!userId) return [];

        const entries = await db
          .select()
          .from(foodEntries)
          .where(
            and(
              eq(foodEntries.user_id, userId),
              gte(foodEntries.consumed_at, startOfDay),
              lte(foodEntries.consumed_at, endOfDay)
            )
          )
          .orderBy(desc(foodEntries.consumed_at));

        return entries;
      },
      enabled: !!userId,
    });
  };

  /**
   * Fetch a single food entry by ID
   */
  const useFoodEntry = (id: string | undefined) => {
    return useQuery({
      queryKey: FOOD_QUERY_KEYS.entry(id || ''),
      queryFn: async (): Promise<FoodEntry | null> => {
        if (!id || !userId) return null;

        const entries = await db
          .select()
          .from(foodEntries)
          .where(and(eq(foodEntries.id, id), eq(foodEntries.user_id, userId)))
          .limit(1);

        return entries[0] || null;
      },
      enabled: !!id && !!userId,
    });
  };

  /**
   * Calculate daily macro summary for a date
   */
  const useDailySummary = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    const { startOfDay, endOfDay } = getDayBounds(date);

    return useQuery({
      queryKey: FOOD_QUERY_KEYS.dailySummary(dateString),
      queryFn: async (): Promise<DailyMacroSummary> => {
        if (!userId) {
          return {
            date: dateString,
            totalCalories: 0,
            totalProtein: 0,
            totalCarbs: 0,
            totalFat: 0,
            totalFiber: 0,
            entryCount: 0,
          };
        }

        const entries = await db
          .select()
          .from(foodEntries)
          .where(
            and(
              eq(foodEntries.user_id, userId),
              gte(foodEntries.consumed_at, startOfDay),
              lte(foodEntries.consumed_at, endOfDay)
            )
          );

        const summary = entries.reduce(
          (acc, entry) => {
            const multiplier = entry.servings;
            return {
              ...acc,
              totalCalories: acc.totalCalories + entry.calories * multiplier,
              totalProtein: acc.totalProtein + entry.protein_g * multiplier,
              totalCarbs: acc.totalCarbs + entry.carbs_g * multiplier,
              totalFat: acc.totalFat + entry.fat_g * multiplier,
              totalFiber: acc.totalFiber + (entry.fiber_g || 0) * multiplier,
              entryCount: acc.entryCount + 1,
            };
          },
          {
            date: dateString,
            totalCalories: 0,
            totalProtein: 0,
            totalCarbs: 0,
            totalFat: 0,
            totalFiber: 0,
            entryCount: 0,
          }
        );

        return summary;
      },
      enabled: !!userId,
    });
  };

  /**
   * Create a new food entry
   */
  const createFoodEntry = useMutation({
    mutationFn: async (input: CreateFoodEntryInput): Promise<FoodEntry> => {
      if (!userId) {
        throw new Error('User must be authenticated');
      }

      const now = nowISO();
      const id = generateId();
      const localId = generateId();

      const newEntry: NewFoodEntry = {
        id,
        user_id: userId,
        name: input.name,
        description: input.description || null,
        calories: input.calories,
        protein_g: input.protein_g,
        carbs_g: input.carbs_g,
        fat_g: input.fat_g,
        fiber_g: input.fiber_g || null,
        serving_size: input.serving_size,
        serving_unit: input.serving_unit,
        servings: input.servings,
        consumed_at: input.consumed_at,
        meal_type: input.meal_type || null,
        picture_id: input.picture_id || null,
        external_food_id: input.external_food_id || null,
        external_source: input.external_source || null,
        notes: input.notes || null,
        local_id: localId,
        sync_status: 'pending',
        created_at: now,
        updated_at: now,
      };

      await db.insert(foodEntries).values(newEntry);

      return newEntry as FoodEntry;
    },
    onSuccess: (entry) => {
      // Invalidate relevant queries
      const date = entry.consumed_at.split('T')[0];
      queryClient.invalidateQueries({ queryKey: FOOD_QUERY_KEYS.entries() });
      queryClient.invalidateQueries({
        queryKey: FOOD_QUERY_KEYS.dailySummary(date),
      });
    },
  });

  /**
   * Update an existing food entry
   */
  const updateFoodEntry = useMutation({
    mutationFn: async (input: UpdateFoodEntryInput): Promise<FoodEntry> => {
      if (!userId) {
        throw new Error('User must be authenticated');
      }

      const now = nowISO();

      // Build update object with only provided fields
      const updates: Partial<FoodEntry> = {
        updated_at: now,
        sync_status: 'pending',
      };

      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined)
        updates.description = input.description || null;
      if (input.calories !== undefined) updates.calories = input.calories;
      if (input.protein_g !== undefined) updates.protein_g = input.protein_g;
      if (input.carbs_g !== undefined) updates.carbs_g = input.carbs_g;
      if (input.fat_g !== undefined) updates.fat_g = input.fat_g;
      if (input.fiber_g !== undefined) updates.fiber_g = input.fiber_g || null;
      if (input.serving_size !== undefined)
        updates.serving_size = input.serving_size;
      if (input.serving_unit !== undefined)
        updates.serving_unit = input.serving_unit;
      if (input.servings !== undefined) updates.servings = input.servings;
      if (input.consumed_at !== undefined)
        updates.consumed_at = input.consumed_at;
      if (input.meal_type !== undefined)
        updates.meal_type = input.meal_type || null;
      if (input.picture_id !== undefined)
        updates.picture_id = input.picture_id || null;
      if (input.notes !== undefined) updates.notes = input.notes || null;

      await db
        .update(foodEntries)
        .set(updates)
        .where(and(eq(foodEntries.id, input.id), eq(foodEntries.user_id, userId)));

      // Fetch and return updated entry
      const entries = await db
        .select()
        .from(foodEntries)
        .where(eq(foodEntries.id, input.id))
        .limit(1);

      if (!entries[0]) {
        throw new Error('Food entry not found');
      }

      return entries[0];
    },
    onSuccess: (entry) => {
      // Invalidate relevant queries
      const date = entry.consumed_at.split('T')[0];
      queryClient.invalidateQueries({ queryKey: FOOD_QUERY_KEYS.entries() });
      queryClient.invalidateQueries({
        queryKey: FOOD_QUERY_KEYS.entry(entry.id),
      });
      queryClient.invalidateQueries({
        queryKey: FOOD_QUERY_KEYS.dailySummary(date),
      });
    },
  });

  /**
   * Delete a food entry
   */
  const deleteFoodEntry = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!userId) {
        throw new Error('User must be authenticated');
      }

      // Get entry first to know the date for cache invalidation
      const entries = await db
        .select()
        .from(foodEntries)
        .where(and(eq(foodEntries.id, id), eq(foodEntries.user_id, userId)))
        .limit(1);

      if (!entries[0]) {
        throw new Error('Food entry not found');
      }

      await db
        .delete(foodEntries)
        .where(and(eq(foodEntries.id, id), eq(foodEntries.user_id, userId)));
    },
    onSuccess: (_, id) => {
      // Invalidate all food queries since we don't know the date
      queryClient.invalidateQueries({ queryKey: FOOD_QUERY_KEYS.all });
    },
  });

  return {
    useFoodEntriesByDate,
    useFoodEntry,
    useDailySummary,
    createFoodEntry,
    updateFoodEntry,
    deleteFoodEntry,
  };
}
