import { useCallback, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { db } from '../db/client';
import { weightEntries, pictures, NewWeightEntry, NewPicture } from '../db/schema';
import { generateUUID } from '@fitness-studio/shared';

export interface WeightEntryWithPicture {
  id: string;
  user_id: string;
  weight_lbs: number;
  recorded_at: string;
  picture_id: string | null;
  notes: string | null;
  local_id: string | null;
  sync_status: 'pending' | 'synced' | 'conflict';
  created_at: string;
  updated_at: string;
  picture?: {
    id: string;
    storage_path: string;
    filename: string;
  } | null;
}

export interface CreateWeightEntryInput {
  weight_lbs: number;
  recorded_at: string;
  notes?: string | null;
  picture_id?: string | null;
}

export interface UpdateWeightEntryInput {
  weight_lbs?: number;
  recorded_at?: string;
  notes?: string | null;
  picture_id?: string | null;
}

export interface WeightTrend {
  direction: 'up' | 'down' | 'stable';
  change: number; // Change in lbs
  currentAverage: number;
  previousAverage: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

// Get a mock user ID for now (will be replaced with actual auth)
const getUserId = () => 'mock-user-id';

export function useWeight() {
  const queryClient = useQueryClient();

  // Query for all weight entries
  const weightEntriesQuery = useQuery({
    queryKey: ['weightEntries'],
    queryFn: async (): Promise<WeightEntryWithPicture[]> => {
      const userId = getUserId();
      const entries = await db
        .select()
        .from(weightEntries)
        .where(eq(weightEntries.user_id, userId))
        .orderBy(desc(weightEntries.recorded_at));

      // Fetch associated pictures
      const entriesWithPictures = await Promise.all(
        entries.map(async (entry) => {
          let picture = null;
          if (entry.picture_id) {
            const pics = await db
              .select({
                id: pictures.id,
                storage_path: pictures.storage_path,
                filename: pictures.filename,
              })
              .from(pictures)
              .where(eq(pictures.id, entry.picture_id));
            picture = pics[0] || null;
          }
          return { ...entry, picture };
        })
      );

      return entriesWithPictures;
    },
  });

  // Query for weight entries within a date range
  const useWeightEntriesByDateRange = (dateRange: DateRange) => {
    return useQuery({
      queryKey: ['weightEntries', 'dateRange', dateRange],
      queryFn: async (): Promise<WeightEntryWithPicture[]> => {
        const userId = getUserId();
        const entries = await db
          .select()
          .from(weightEntries)
          .where(
            and(
              eq(weightEntries.user_id, userId),
              gte(weightEntries.recorded_at, dateRange.startDate),
              lte(weightEntries.recorded_at, dateRange.endDate)
            )
          )
          .orderBy(desc(weightEntries.recorded_at));

        const entriesWithPictures = await Promise.all(
          entries.map(async (entry) => {
            let picture = null;
            if (entry.picture_id) {
              const pics = await db
                .select({
                  id: pictures.id,
                  storage_path: pictures.storage_path,
                  filename: pictures.filename,
                })
                .from(pictures)
                .where(eq(pictures.id, entry.picture_id));
              picture = pics[0] || null;
            }
            return { ...entry, picture };
          })
        );

        return entriesWithPictures;
      },
    });
  };

  // Get a single weight entry by ID
  const useWeightEntry = (id: string) => {
    return useQuery({
      queryKey: ['weightEntry', id],
      queryFn: async (): Promise<WeightEntryWithPicture | null> => {
        const entries = await db
          .select()
          .from(weightEntries)
          .where(eq(weightEntries.id, id));

        const entry = entries[0];
        if (!entry) return null;

        let picture = null;
        if (entry.picture_id) {
          const pics = await db
            .select({
              id: pictures.id,
              storage_path: pictures.storage_path,
              filename: pictures.filename,
            })
            .from(pictures)
            .where(eq(pictures.id, entry.picture_id));
          picture = pics[0] || null;
        }

        return { ...entry, picture };
      },
      enabled: !!id,
    });
  };

  // Create weight entry mutation
  const createWeightEntry = useMutation({
    mutationFn: async (input: CreateWeightEntryInput): Promise<string> => {
      const userId = getUserId();
      const id = generateUUID();
      const localId = generateUUID();
      const now = new Date().toISOString();

      const newEntry: NewWeightEntry = {
        id,
        user_id: userId,
        weight_lbs: input.weight_lbs,
        recorded_at: input.recorded_at,
        notes: input.notes || null,
        picture_id: input.picture_id || null,
        local_id: localId,
        sync_status: 'pending',
        created_at: now,
        updated_at: now,
      };

      await db.insert(weightEntries).values(newEntry);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weightEntries'] });
    },
  });

  // Update weight entry mutation
  const updateWeightEntry = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateWeightEntryInput;
    }): Promise<void> => {
      const now = new Date().toISOString();

      await db
        .update(weightEntries)
        .set({
          ...data,
          sync_status: 'pending',
          updated_at: now,
        })
        .where(eq(weightEntries.id, id));
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['weightEntries'] });
      queryClient.invalidateQueries({ queryKey: ['weightEntry', id] });
    },
  });

  // Delete weight entry mutation
  const deleteWeightEntry = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await db.delete(weightEntries).where(eq(weightEntries.id, id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weightEntries'] });
    },
  });

  // Calculate 7-day rolling average
  const calculateRollingAverage = useCallback(
    (entries: WeightEntryWithPicture[], daysBack: number = 7): number | null => {
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      const cutoffString = cutoffDate.toISOString();

      const recentEntries = entries.filter(
        (entry) => entry.recorded_at >= cutoffString
      );

      if (recentEntries.length === 0) return null;

      const sum = recentEntries.reduce((acc, entry) => acc + entry.weight_lbs, 0);
      return sum / recentEntries.length;
    },
    []
  );

  // Calculate weight trend
  const calculateTrend = useCallback(
    (entries: WeightEntryWithPicture[]): WeightTrend | null => {
      if (entries.length < 2) return null;

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const currentWeekEntries = entries.filter(
        (entry) =>
          entry.recorded_at >= sevenDaysAgo.toISOString() &&
          entry.recorded_at <= now.toISOString()
      );

      const previousWeekEntries = entries.filter(
        (entry) =>
          entry.recorded_at >= fourteenDaysAgo.toISOString() &&
          entry.recorded_at < sevenDaysAgo.toISOString()
      );

      if (currentWeekEntries.length === 0 || previousWeekEntries.length === 0) {
        return null;
      }

      const currentAverage =
        currentWeekEntries.reduce((sum, e) => sum + e.weight_lbs, 0) /
        currentWeekEntries.length;
      const previousAverage =
        previousWeekEntries.reduce((sum, e) => sum + e.weight_lbs, 0) /
        previousWeekEntries.length;

      const change = currentAverage - previousAverage;
      const threshold = 0.5; // 0.5 lbs threshold for stable

      let direction: 'up' | 'down' | 'stable';
      if (Math.abs(change) <= threshold) {
        direction = 'stable';
      } else if (change > 0) {
        direction = 'up';
      } else {
        direction = 'down';
      }

      return {
        direction,
        change: Math.round(change * 10) / 10,
        currentAverage: Math.round(currentAverage * 10) / 10,
        previousAverage: Math.round(previousAverage * 10) / 10,
      };
    },
    []
  );

  return {
    // Queries
    weightEntries: weightEntriesQuery.data || [],
    isLoading: weightEntriesQuery.isLoading,
    error: weightEntriesQuery.error,
    refetch: weightEntriesQuery.refetch,

    // Hooks
    useWeightEntry,
    useWeightEntriesByDateRange,

    // Mutations
    createWeightEntry,
    updateWeightEntry,
    deleteWeightEntry,

    // Utilities
    calculateRollingAverage,
    calculateTrend,
  };
}

// Export a hook for getting the latest weight
export function useLatestWeight() {
  return useQuery({
    queryKey: ['latestWeight'],
    queryFn: async (): Promise<number | null> => {
      const userId = getUserId();
      const entries = await db
        .select({ weight_lbs: weightEntries.weight_lbs })
        .from(weightEntries)
        .where(eq(weightEntries.user_id, userId))
        .orderBy(desc(weightEntries.recorded_at))
        .limit(1);

      return entries[0]?.weight_lbs ?? null;
    },
  });
}
