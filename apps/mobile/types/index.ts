// Re-export shared types
export type {
  Sex,
  ActivityLevel,
  Goal,
  SyncStatus,
  PictureType,
  ReviewStatus,
  Macros,
  UserFitnessProfile,
  WeightEntry,
  FoodEntry,
  Picture,
  Profile,
} from '@fitness-studio/shared';

// App-specific types
export interface LocalEntity {
  local_id: string;
  sync_status: 'pending' | 'synced' | 'conflict';
}
