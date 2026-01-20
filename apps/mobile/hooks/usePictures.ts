import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eq, and, desc, or } from 'drizzle-orm';
import { db } from '../db/client';
import { pictures, Picture, NewPicture } from '../db/schema';

export interface UpdatePictureInput {
  is_reviewed?: boolean;
  review_status?: 'pending' | 'approved' | 'rejected';
}

// Mock user ID - will be replaced with actual auth
const getUserId = () => 'mock-user-id';

export function usePictures() {
  const queryClient = useQueryClient();

  // Query for all unreviewed pictures (both weight and food)
  const allUnreviewedPicturesQuery = useQuery({
    queryKey: ['pictures', 'all', 'unreviewed'],
    queryFn: async (): Promise<Picture[]> => {
      const userId = getUserId();
      const result = await db
        .select()
        .from(pictures)
        .where(
          and(
            eq(pictures.user_id, userId),
            eq(pictures.is_reviewed, false),
            eq(pictures.review_status, 'pending'),
            or(
              eq(pictures.picture_type, 'weight'),
              eq(pictures.picture_type, 'food')
            )
          )
        )
        .orderBy(desc(pictures.created_at));
      return result;
    },
  });

  // Query for unreviewed weight pictures
  const unreviewedWeightPicturesQuery = useQuery({
    queryKey: ['pictures', 'weight', 'unreviewed'],
    queryFn: async (): Promise<Picture[]> => {
      const userId = getUserId();
      const result = await db
        .select()
        .from(pictures)
        .where(
          and(
            eq(pictures.user_id, userId),
            eq(pictures.picture_type, 'weight'),
            eq(pictures.is_reviewed, false)
          )
        )
        .orderBy(desc(pictures.created_at));
      return result;
    },
  });

  // Query for unreviewed food pictures
  const unreviewedFoodPicturesQuery = useQuery({
    queryKey: ['pictures', 'food', 'unreviewed'],
    queryFn: async (): Promise<Picture[]> => {
      const userId = getUserId();
      const result = await db
        .select()
        .from(pictures)
        .where(
          and(
            eq(pictures.user_id, userId),
            eq(pictures.picture_type, 'food'),
            eq(pictures.is_reviewed, false)
          )
        )
        .orderBy(desc(pictures.created_at));
      return result;
    },
  });

  // Get a single picture by ID
  const usePicture = (id: string) => {
    return useQuery({
      queryKey: ['picture', id],
      queryFn: async (): Promise<Picture | null> => {
        const result = await db
          .select()
          .from(pictures)
          .where(eq(pictures.id, id));
        return result[0] || null;
      },
      enabled: !!id,
    });
  };

  // Update picture mutation
  const updatePicture = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdatePictureInput;
    }): Promise<void> => {
      const now = new Date().toISOString();
      await db
        .update(pictures)
        .set({
          ...data,
          sync_status: 'pending',
          updated_at: now,
        })
        .where(eq(pictures.id, id));
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['pictures'] });
      queryClient.invalidateQueries({ queryKey: ['picture', id] });
    },
  });

  // Mark picture as reviewed
  const markAsReviewed = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const now = new Date().toISOString();
      await db
        .update(pictures)
        .set({
          is_reviewed: true,
          review_status: 'approved',
          sync_status: 'pending',
          updated_at: now,
        })
        .where(eq(pictures.id, id));
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['pictures'] });
      queryClient.invalidateQueries({ queryKey: ['picture', id] });
    },
  });

  // Skip picture review
  const skipReview = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const now = new Date().toISOString();
      await db
        .update(pictures)
        .set({
          is_reviewed: true,
          review_status: 'rejected',
          sync_status: 'pending',
          updated_at: now,
        })
        .where(eq(pictures.id, id));
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['pictures'] });
      queryClient.invalidateQueries({ queryKey: ['picture', id] });
    },
  });

  // Delete picture
  const deletePicture = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await db.delete(pictures).where(eq(pictures.id, id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pictures'] });
    },
  });

  return {
    // Queries
    allUnreviewedPictures: allUnreviewedPicturesQuery.data || [],
    unreviewedWeightPictures: unreviewedWeightPicturesQuery.data || [],
    unreviewedFoodPictures: unreviewedFoodPicturesQuery.data || [],
    isLoadingAllPictures: allUnreviewedPicturesQuery.isLoading,
    isLoadingWeightPictures: unreviewedWeightPicturesQuery.isLoading,
    isLoadingFoodPictures: unreviewedFoodPicturesQuery.isLoading,
    refetchAllPictures: allUnreviewedPicturesQuery.refetch,
    refetchWeightPictures: unreviewedWeightPicturesQuery.refetch,
    refetchFoodPictures: unreviewedFoodPicturesQuery.refetch,

    // Hooks
    usePicture,

    // Mutations
    updatePicture,
    markAsReviewed,
    skipReview,
    deletePicture,
  };
}

// Count of unreviewed pictures by type
export function useUnreviewedCount(pictureType: 'weight' | 'food') {
  return useQuery({
    queryKey: ['pictures', pictureType, 'count'],
    queryFn: async (): Promise<number> => {
      const userId = getUserId();
      const result = await db
        .select()
        .from(pictures)
        .where(
          and(
            eq(pictures.user_id, userId),
            eq(pictures.picture_type, pictureType),
            eq(pictures.is_reviewed, false)
          )
        );
      return result.length;
    },
  });
}
