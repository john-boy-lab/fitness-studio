/**
 * Dashboard Screen
 * Main landing screen showing today's summary, weight progress, and quick actions
 */

import { useMemo, useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, ScrollView, Spinner, Card } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth.store';
import { useFood } from '../../hooks/useFood';
import { useWeight, useLatestWeight } from '../../hooks/useWeight';
import { useUnreviewedCount } from '../../hooks/usePictures';
import {
  CalorieRing,
  MacroBar,
  WeightProgress,
  QuickActions,
} from '../../components/dashboard';

// Default daily targets - will come from user profile
const DEFAULT_TARGETS = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
};

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Food data for today
  const { useDailySummary } = useFood();
  const today = useMemo(() => new Date(), []);
  const { data: todaySummary, isLoading: foodLoading, refetch: refetchFood } = useDailySummary(today);

  // Weight data
  const {
    weightEntries,
    isLoading: weightLoading,
    refetch: refetchWeight,
    calculateTrend,
  } = useWeight();
  const { data: latestWeight } = useLatestWeight();

  // Unreviewed pictures count
  const { data: unreviewedWeightCount = 0, refetch: refetchWeightCount } = useUnreviewedCount('weight');
  const { data: unreviewedFoodCount = 0, refetch: refetchFoodCount } = useUnreviewedCount('food');
  const totalUnreviewed = unreviewedWeightCount + unreviewedFoodCount;

  // Calculate consumed macros
  const consumedMacros = useMemo(
    () => ({
      calories: todaySummary?.totalCalories || 0,
      protein: todaySummary?.totalProtein || 0,
      carbs: todaySummary?.totalCarbs || 0,
      fat: todaySummary?.totalFat || 0,
    }),
    [todaySummary]
  );

  // Get recent weight entries for sparkline (last 14 days)
  const recentWeightEntries = useMemo(() => {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    return weightEntries.filter(
      (entry) => new Date(entry.recorded_at) >= fourteenDaysAgo
    );
  }, [weightEntries]);

  // Get start weight (first entry)
  const startWeight = useMemo(() => {
    if (weightEntries.length === 0) return null;
    return weightEntries[weightEntries.length - 1].weight_lbs;
  }, [weightEntries]);

  // TODO: Get goal weight from user profile
  const goalWeight = null; // Placeholder - will come from user profile

  // Pull to refresh
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchFood(),
        refetchWeight(),
        refetchWeightCount(),
        refetchFoodCount(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchFood, refetchWeight, refetchWeightCount, refetchFoodCount]);

  const isLoading = foodLoading || weightLoading;

  const handleWeightPress = () => {
    if (latestWeight) {
      router.push('/(auth)/weight/');
    } else {
      router.push('/(auth)/weight/add');
    }
  };

  const handleFoodPress = () => {
    router.push('/(auth)/food/');
  };

  // Get greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'there';

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" />
        <Text marginTop="$4" color="$gray11">
          Loading dashboard...
        </Text>
      </YStack>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView
        flex={1}
        backgroundColor="$background"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <YStack padding="$4" gap="$5">
          {/* Header */}
          <YStack gap="$1">
            <Text fontSize="$8" fontWeight="700" color="$gray12">
              {greeting}, {displayName}
            </Text>
            <Text fontSize="$4" color="$gray11">
              {today.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </YStack>

          {/* Today's Summary Card */}
          <Card
            padding="$4"
            backgroundColor="$backgroundStrong"
            borderRadius="$4"
            pressStyle={{ scale: 0.98 }}
            animation="quick"
            onPress={handleFoodPress}
          >
            <YStack gap="$4">
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$5" fontWeight="600" color="$gray12">
                  Today's Nutrition
                </Text>
                <Text fontSize="$3" color="$gray10">
                  {todaySummary?.entryCount || 0} entries
                </Text>
              </XStack>

              {/* Calorie ring and macros */}
              <XStack gap="$4" alignItems="center">
                <CalorieRing
                  consumed={consumedMacros.calories}
                  target={DEFAULT_TARGETS.calories}
                  size={140}
                />

                <YStack flex={1} gap="$3">
                  <MacroBar
                    label="Protein"
                    current={consumedMacros.protein}
                    target={DEFAULT_TARGETS.protein}
                    color="$red10"
                  />
                  <MacroBar
                    label="Carbs"
                    current={consumedMacros.carbs}
                    target={DEFAULT_TARGETS.carbs}
                    color="$green10"
                  />
                  <MacroBar
                    label="Fat"
                    current={consumedMacros.fat}
                    target={DEFAULT_TARGETS.fat}
                    color="$yellow10"
                  />
                </YStack>
              </XStack>
            </YStack>
          </Card>

          {/* Weight Progress */}
          <YStack gap="$2">
            <Text fontSize="$4" fontWeight="600" color="$gray12">
              Weight Progress
            </Text>
            <WeightProgress
              currentWeight={latestWeight || null}
              goalWeight={goalWeight}
              startWeight={startWeight}
              recentEntries={recentWeightEntries}
              onPress={handleWeightPress}
            />
          </YStack>

          {/* Quick Actions */}
          <QuickActions unreviewedCount={totalUnreviewed} />

          {/* Unreviewed Pictures Alert */}
          {totalUnreviewed > 0 && (
            <Card
              padding="$4"
              backgroundColor="$purple3"
              borderRadius="$4"
              pressStyle={{ scale: 0.98 }}
              animation="quick"
              onPress={() => router.push('/(auth)/review/')}
            >
              <XStack alignItems="center" gap="$3">
                <XStack
                  backgroundColor="$purple10"
                  width={40}
                  height={40}
                  borderRadius="$3"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize="$5" fontWeight="700" color="white">
                    {totalUnreviewed}
                  </Text>
                </XStack>
                <YStack flex={1}>
                  <Text fontSize="$4" fontWeight="600" color="$purple12">
                    Photos awaiting review
                  </Text>
                  <Text fontSize="$3" color="$purple11">
                    Tap to review and log your data
                  </Text>
                </YStack>
              </XStack>
            </Card>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
