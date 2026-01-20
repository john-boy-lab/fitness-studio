/**
 * WeightProgress Component
 * Displays current weight progress towards goal with mini sparkline
 */

import { useMemo } from 'react';
import { YStack, XStack, Text, Card } from 'tamagui';
import { TrendingDown, TrendingUp, Minus, Scale } from '@tamagui/lucide-icons';
import Svg, { Path, Line } from 'react-native-svg';

interface WeightEntry {
  weight_lbs: number;
  recorded_at: string;
}

interface WeightProgressProps {
  currentWeight: number | null;
  goalWeight: number | null;
  startWeight?: number | null;
  recentEntries: WeightEntry[];
  onPress?: () => void;
}

export function WeightProgress({
  currentWeight,
  goalWeight,
  startWeight,
  recentEntries,
  onPress,
}: WeightProgressProps) {
  // Calculate progress percentage
  const progress = useMemo(() => {
    if (!currentWeight || !goalWeight || !startWeight) return null;
    if (startWeight === goalWeight) return 100;

    const totalChange = Math.abs(goalWeight - startWeight);
    const currentChange = Math.abs(currentWeight - startWeight);

    // Check if moving in the right direction
    const isLosingWeight = goalWeight < startWeight;
    const movingCorrectDirection = isLosingWeight
      ? currentWeight < startWeight
      : currentWeight > startWeight;

    if (!movingCorrectDirection) return 0;

    // Check if goal reached or exceeded
    if (isLosingWeight && currentWeight <= goalWeight) return 100;
    if (!isLosingWeight && currentWeight >= goalWeight) return 100;

    return Math.min(100, Math.round((currentChange / totalChange) * 100));
  }, [currentWeight, goalWeight, startWeight]);

  // Generate sparkline path
  const sparkline = useMemo(() => {
    if (recentEntries.length < 2) return null;

    const width = 100;
    const height = 30;
    const padding = 2;

    const sortedEntries = [...recentEntries]
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .slice(-14); // Last 14 days

    if (sortedEntries.length < 2) return null;

    const weights = sortedEntries.map((e) => e.weight_lbs);
    const minWeight = Math.min(...weights) - 1;
    const maxWeight = Math.max(...weights) + 1;
    const range = maxWeight - minWeight || 1;

    const points = sortedEntries.map((entry, index) => {
      const x = padding + (index / (sortedEntries.length - 1)) * (width - 2 * padding);
      const y =
        padding + ((maxWeight - entry.weight_lbs) / range) * (height - 2 * padding);
      return { x, y };
    });

    const pathData = points
      .map((point, i) => (i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
      .join(' ');

    // Determine trend
    const firstAvg =
      sortedEntries.slice(0, Math.ceil(sortedEntries.length / 2)).reduce((a, b) => a + b.weight_lbs, 0) /
      Math.ceil(sortedEntries.length / 2);
    const lastAvg =
      sortedEntries.slice(Math.ceil(sortedEntries.length / 2)).reduce((a, b) => a + b.weight_lbs, 0) /
      Math.floor(sortedEntries.length / 2);

    const trend = Math.abs(lastAvg - firstAvg) < 0.5 ? 'stable' : lastAvg < firstAvg ? 'down' : 'up';
    const color = trend === 'stable' ? '#6b7280' : trend === 'down' ? '#22c55e' : '#ef4444';

    return { pathData, width, height, color, trend };
  }, [recentEntries]);

  // Determine trend icon
  const TrendIcon = useMemo(() => {
    if (!sparkline) return Minus;
    return sparkline.trend === 'down' ? TrendingDown : sparkline.trend === 'up' ? TrendingUp : Minus;
  }, [sparkline]);

  const trendColor = sparkline?.color || '$gray10';

  if (!currentWeight) {
    return (
      <Card
        padding="$4"
        backgroundColor="$gray2"
        borderRadius="$4"
        pressStyle={{ scale: 0.98 }}
        animation="quick"
        onPress={onPress}
      >
        <XStack alignItems="center" gap="$3">
          <Scale size={24} color="$gray9" />
          <YStack flex={1}>
            <Text fontSize="$4" fontWeight="600" color="$gray10">
              No weight logged yet
            </Text>
            <Text fontSize="$3" color="$gray9">
              Tap to log your first weight
            </Text>
          </YStack>
        </XStack>
      </Card>
    );
  }

  return (
    <Card
      padding="$4"
      backgroundColor="$backgroundStrong"
      borderRadius="$4"
      pressStyle={{ scale: 0.98 }}
      animation="quick"
      onPress={onPress}
    >
      <YStack gap="$3">
        {/* Header with current weight */}
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack>
            <XStack alignItems="baseline" gap="$2">
              <Text fontSize="$8" fontWeight="700" color="$gray12">
                {currentWeight.toFixed(1)}
              </Text>
              <Text fontSize="$4" color="$gray10">
                lbs
              </Text>
            </XStack>
            <Text fontSize="$3" color="$gray11">
              Current weight
            </Text>
          </YStack>

          {/* Trend indicator */}
          <XStack alignItems="center" gap="$1">
            <TrendIcon size={18} color={trendColor} />
          </XStack>
        </XStack>

        {/* Sparkline */}
        {sparkline && (
          <YStack alignItems="center">
            <Svg width={sparkline.width} height={sparkline.height}>
              <Path
                d={sparkline.pathData}
                stroke={sparkline.color}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </YStack>
        )}

        {/* Goal progress */}
        {goalWeight && progress !== null && (
          <YStack gap="$1">
            <XStack justifyContent="space-between">
              <Text fontSize="$3" color="$gray11">
                Goal: {goalWeight.toFixed(1)} lbs
              </Text>
              <Text fontSize="$3" fontWeight="600" color="$blue10">
                {progress}% there
              </Text>
            </XStack>
            <YStack
              backgroundColor="$gray4"
              height={4}
              borderRadius="$1"
              overflow="hidden"
            >
              <YStack
                backgroundColor="$blue10"
                height="100%"
                width={`${progress}%`}
              />
            </YStack>
          </YStack>
        )}
      </YStack>
    </Card>
  );
}
