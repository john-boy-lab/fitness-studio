/**
 * DailySummary Component
 * Displays daily macro totals with progress bars
 */

import { YStack, XStack, Text, Card, Separator } from 'tamagui';
import { MacroProgressBar } from './MacroProgressBar';

interface DailyMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

interface DailySummaryProps {
  date: Date;
  consumed: DailyMacros;
  targets: DailyMacros;
}

export function DailySummary({ date, consumed, targets }: DailySummaryProps) {
  // Format date
  const isToday = new Date().toDateString() === date.toDateString();
  const dateDisplay = isToday
    ? 'Today'
    : date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

  // Calculate remaining calories
  const remainingCalories = targets.calories - consumed.calories;

  return (
    <Card elevate bordered padding="$4" marginBottom="$3">
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
        <Text fontSize="$5" fontWeight="600">
          {dateDisplay}
        </Text>
        <YStack alignItems="flex-end">
          <Text
            fontSize="$6"
            fontWeight="700"
            color={remainingCalories >= 0 ? '$green10' : '$red10'}
          >
            {Math.abs(Math.round(remainingCalories))}
          </Text>
          <Text fontSize="$2" color="$gray10">
            {remainingCalories >= 0 ? 'cal remaining' : 'cal over'}
          </Text>
        </YStack>
      </XStack>

      <Separator marginBottom="$3" />

      {/* Macro Progress Bars */}
      <YStack gap="$3">
        <MacroProgressBar
          label="Calories"
          current={consumed.calories}
          target={targets.calories}
          unit=""
          color="$orange10"
        />
        <MacroProgressBar
          label="Protein"
          current={consumed.protein}
          target={targets.protein}
          unit="g"
          color="$red10"
        />
        <MacroProgressBar
          label="Carbs"
          current={consumed.carbs}
          target={targets.carbs}
          unit="g"
          color="$blue10"
        />
        <MacroProgressBar
          label="Fat"
          current={consumed.fat}
          target={targets.fat}
          unit="g"
          color="$yellow10"
        />
        {targets.fiber !== undefined && targets.fiber > 0 && (
          <MacroProgressBar
            label="Fiber"
            current={consumed.fiber || 0}
            target={targets.fiber}
            unit="g"
            color="$green10"
          />
        )}
      </YStack>

      <Separator marginVertical="$3" />

      {/* Quick Stats */}
      <XStack justifyContent="space-around">
        <YStack alignItems="center">
          <Text fontSize="$4" fontWeight="600" color="$orange10">
            {Math.round(consumed.calories)}
          </Text>
          <Text fontSize="$2" color="$gray10">
            calories
          </Text>
        </YStack>
        <YStack alignItems="center">
          <Text fontSize="$4" fontWeight="600" color="$red10">
            {Math.round(consumed.protein)}g
          </Text>
          <Text fontSize="$2" color="$gray10">
            protein
          </Text>
        </YStack>
        <YStack alignItems="center">
          <Text fontSize="$4" fontWeight="600" color="$blue10">
            {Math.round(consumed.carbs)}g
          </Text>
          <Text fontSize="$2" color="$gray10">
            carbs
          </Text>
        </YStack>
        <YStack alignItems="center">
          <Text fontSize="$4" fontWeight="600" color="$yellow10">
            {Math.round(consumed.fat)}g
          </Text>
          <Text fontSize="$2" color="$gray10">
            fat
          </Text>
        </YStack>
      </XStack>
    </Card>
  );
}
