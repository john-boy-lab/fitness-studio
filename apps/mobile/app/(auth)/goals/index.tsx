import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  H2,
  H4,
  Button,
  Label,
  Input,
  RadioGroup,
  Spinner,
  Card,
} from 'tamagui';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  goalsFormSchema,
  GoalsFormData,
  ProfileGoalType,
  GOAL_TYPE_LABELS,
  WEEKLY_RATE_LABELS,
} from '@fitness-studio/shared/validation';
import {
  calculateAllMetrics,
  ActivityLevel,
  GoalType,
  WeeklyRate,
  MacroTargets,
} from '@fitness-studio/shared/utils';
import { useAuthStore } from '../../../store/auth.store';
import { supabase } from '../../../services/supabase';

interface UserProfile {
  height_inches: number;
  birth_date: string;
  sex: 'male' | 'female' | 'other';
  activity_level: ActivityLevel;
  goal_type?: GoalType;
  target_weight_lbs?: number;
  weekly_rate_lbs?: number;
}

export default function GoalsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GoalsFormData>({
    resolver: zodResolver(goalsFormSchema),
    defaultValues: {
      target_weight_lbs: 150,
      goal_type: 'maintain',
      weekly_rate_lbs: 1,
    },
  });

  const watchedGoalType = watch('goal_type');
  const watchedTargetWeight = watch('target_weight_lbs');
  const watchedWeeklyRate = watch('weekly_rate_lbs');

  // Load profile and latest weight
  useEffect(() => {
    async function loadData() {
      if (!user?.id) return;

      try {
        // Load fitness profile
        const { data: profileData, error: profileError } = await supabase
          .from('user_fitness_profile')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            // No profile found, redirect to profile setup
            router.replace('/(auth)/profile');
            return;
          }
          throw profileError;
        }

        setProfile(profileData);

        // Set form values from existing profile
        if (profileData.goal_type) {
          setValue('goal_type', profileData.goal_type as ProfileGoalType);
        }
        if (profileData.target_weight_lbs) {
          setValue('target_weight_lbs', profileData.target_weight_lbs);
        }
        if (profileData.weekly_rate_lbs) {
          setValue('weekly_rate_lbs', profileData.weekly_rate_lbs);
        }

        // Load latest weight entry
        const { data: weightData } = await supabase
          .from('weight_entries')
          .select('weight_lbs')
          .eq('user_id', user.id)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .single();

        if (weightData) {
          setCurrentWeight(weightData.weight_lbs);
          setValue('current_weight_lbs', weightData.weight_lbs);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user?.id, router, setValue]);

  // Calculate metrics in real-time
  const calculatedMetrics = useMemo((): MacroTargets | null => {
    if (!profile || !currentWeight) return null;

    try {
      const metrics = calculateAllMetrics({
        weightLbs: currentWeight,
        heightInches: profile.height_inches,
        birthDate: profile.birth_date,
        sex: profile.sex,
        activityLevel: profile.activity_level,
        goalType: (watchedGoalType || 'maintain') as GoalType,
        weeklyRateLbs: (watchedWeeklyRate || 1) as WeeklyRate,
      });

      return metrics.macros;
    } catch (err) {
      console.error('Error calculating metrics:', err);
      return null;
    }
  }, [profile, currentWeight, watchedGoalType, watchedWeeklyRate]);

  const onSubmit = async (data: GoalsFormData) => {
    if (!user?.id || !profile) return;

    setIsSaving(true);
    setError(null);

    try {
      // Calculate final metrics to store
      const metrics = currentWeight
        ? calculateAllMetrics({
            weightLbs: currentWeight,
            heightInches: profile.height_inches,
            birthDate: profile.birth_date,
            sex: profile.sex,
            activityLevel: profile.activity_level,
            goalType: data.goal_type as GoalType,
            weeklyRateLbs: data.weekly_rate_lbs as WeeklyRate,
          })
        : null;

      // Update the profile with goals
      const { error } = await supabase
        .from('user_fitness_profile')
        .update({
          goal_type: data.goal_type,
          target_weight_lbs: data.target_weight_lbs,
          weekly_rate_lbs: data.weekly_rate_lbs,
          calculated_bmr: metrics?.bmr,
          calculated_tdee: metrics?.tdee,
          calculated_macros: metrics?.macros,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Navigate to dashboard
      router.replace('/(auth)');
    } catch (err) {
      console.error('Error saving goals:', err);
      setError('Failed to save goals');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" />
        <Text marginTop="$3">Loading...</Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} padding="$4" backgroundColor="$background">
      <H2 marginBottom="$4">Your Goals</H2>
      <Text color="$gray10" marginBottom="$6">
        Set your weight goals and we'll calculate your daily targets.
      </Text>

      {error && (
        <XStack
          backgroundColor="$red2"
          padding="$3"
          borderRadius="$2"
          marginBottom="$4"
        >
          <Text color="$red10">{error}</Text>
        </XStack>
      )}

      {/* Current Weight Display */}
      <YStack marginBottom="$4">
        <Label>Current Weight</Label>
        {currentWeight ? (
          <Text fontSize="$6" fontWeight="bold">
            {currentWeight} lbs
          </Text>
        ) : (
          <XStack alignItems="center" gap="$2">
            <Controller
              control={control}
              name="current_weight_lbs"
              render={({ field: { onChange, value } }) => (
                <Input
                  flex={1}
                  keyboardType="numeric"
                  value={value ? String(value) : ''}
                  onChangeText={(text) => {
                    const num = parseFloat(text);
                    if (!isNaN(num)) {
                      onChange(num);
                      setCurrentWeight(num);
                    }
                  }}
                  placeholder="Enter current weight"
                />
              )}
            />
            <Text>lbs</Text>
          </XStack>
        )}
        <Text fontSize="$2" color="$gray10" marginTop="$1">
          {currentWeight
            ? 'From your latest weigh-in'
            : 'Enter your current weight to continue'}
        </Text>
      </YStack>

      {/* Target Weight Input */}
      <YStack marginBottom="$4">
        <Label htmlFor="target_weight">Target Weight</Label>
        <Controller
          control={control}
          name="target_weight_lbs"
          render={({ field: { onChange, value } }) => (
            <XStack alignItems="center" gap="$2">
              <Input
                id="target_weight"
                flex={1}
                keyboardType="numeric"
                value={String(value || '')}
                onChangeText={(text) => {
                  const num = parseFloat(text);
                  if (!isNaN(num)) {
                    onChange(num);
                  }
                }}
                placeholder="Target weight"
              />
              <Text>lbs</Text>
            </XStack>
          )}
        />
        {errors.target_weight_lbs && (
          <Text color="$red10" fontSize="$2" marginTop="$1">
            {errors.target_weight_lbs.message}
          </Text>
        )}
      </YStack>

      {/* Goal Type Radio */}
      <YStack marginBottom="$4">
        <Label marginBottom="$2">Goal Type</Label>
        <Controller
          control={control}
          name="goal_type"
          render={({ field: { onChange, value } }) => (
            <RadioGroup value={value} onValueChange={onChange}>
              <YStack gap="$2">
                {(Object.keys(GOAL_TYPE_LABELS) as ProfileGoalType[]).map((goal) => (
                  <XStack key={goal} alignItems="center" gap="$2">
                    <RadioGroup.Item value={goal} id={`goal-${goal}`}>
                      <RadioGroup.Indicator />
                    </RadioGroup.Item>
                    <Label htmlFor={`goal-${goal}`}>{GOAL_TYPE_LABELS[goal]}</Label>
                  </XStack>
                ))}
              </YStack>
            </RadioGroup>
          )}
        />
        {errors.goal_type && (
          <Text color="$red10" fontSize="$2" marginTop="$1">
            {errors.goal_type.message}
          </Text>
        )}
      </YStack>

      {/* Weekly Rate Radio (only for lose/gain) */}
      {watchedGoalType !== 'maintain' && (
        <YStack marginBottom="$4">
          <Label marginBottom="$2">Rate of Change</Label>
          <Controller
            control={control}
            name="weekly_rate_lbs"
            render={({ field: { onChange, value } }) => (
              <RadioGroup
                value={String(value)}
                onValueChange={(v) => onChange(parseFloat(v))}
              >
                <YStack gap="$2">
                  {['0.5', '1'].map((rate) => (
                    <XStack key={rate} alignItems="center" gap="$2">
                      <RadioGroup.Item value={rate} id={`rate-${rate}`}>
                        <RadioGroup.Indicator />
                      </RadioGroup.Item>
                      <Label htmlFor={`rate-${rate}`}>
                        {WEEKLY_RATE_LABELS[rate]}
                      </Label>
                    </XStack>
                  ))}
                </YStack>
              </RadioGroup>
            )}
          />
        </YStack>
      )}

      {/* Calculated Targets Display */}
      {calculatedMetrics && currentWeight && (
        <Card marginBottom="$6" padding="$4" bordered>
          <H4 marginBottom="$3">Daily Targets</H4>
          <YStack gap="$2">
            <XStack justifyContent="space-between">
              <Text color="$gray10">Calories</Text>
              <Text fontWeight="bold">{calculatedMetrics.calories} kcal</Text>
            </XStack>
            <XStack justifyContent="space-between">
              <Text color="$gray10">Protein</Text>
              <Text fontWeight="bold">{calculatedMetrics.protein_g}g</Text>
            </XStack>
            <XStack justifyContent="space-between">
              <Text color="$gray10">Carbs</Text>
              <Text fontWeight="bold">{calculatedMetrics.carbs_g}g</Text>
            </XStack>
            <XStack justifyContent="space-between">
              <Text color="$gray10">Fat</Text>
              <Text fontWeight="bold">{calculatedMetrics.fat_g}g</Text>
            </XStack>
          </YStack>
        </Card>
      )}

      {/* Submit Button */}
      <Button
        size="$5"
        theme="active"
        onPress={handleSubmit(onSubmit)}
        disabled={isSaving || !currentWeight}
      >
        {isSaving ? <Spinner /> : 'Save Goals'}
      </Button>

      {/* Back to Profile Button */}
      <Button
        marginTop="$3"
        variant="outlined"
        onPress={() => router.push('/(auth)/profile')}
      >
        Back to Profile
      </Button>
    </YStack>
  );
}
