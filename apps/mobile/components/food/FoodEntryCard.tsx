/**
 * FoodEntryCard Component
 * Displays a food entry in the food log list
 */

import { YStack, XStack, Text, Card, Separator } from 'tamagui';
import type { FoodEntry } from '../../db/schema';

interface FoodEntryCardProps {
  entry: FoodEntry;
  onPress: (entry: FoodEntry) => void;
}

export function FoodEntryCard({ entry, onPress }: FoodEntryCardProps) {
  const handlePress = () => {
    onPress(entry);
  };

  // Format time from consumed_at
  const time = new Date(entry.consumed_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate total values based on servings
  const totalCalories = Math.round(entry.calories * entry.servings);
  const totalProtein = Math.round(entry.protein_g * entry.servings * 10) / 10;
  const totalCarbs = Math.round(entry.carbs_g * entry.servings * 10) / 10;
  const totalFat = Math.round(entry.fat_g * entry.servings * 10) / 10;

  // Format serving info
  const servingInfo =
    entry.servings === 1
      ? `${entry.serving_size}${entry.serving_unit}`
      : `${entry.servings} x ${entry.serving_size}${entry.serving_unit}`;

  return (
    <Card
      elevate
      bordered
      pressStyle={{ scale: 0.98, opacity: 0.9 }}
      onPress={handlePress}
      marginVertical="$1"
      padding="$3"
    >
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack flex={1} gap="$1">
          {/* Time */}
          <Text fontSize="$2" color="$gray10">
            {time}
          </Text>

          {/* Food Name */}
          <Text fontSize="$4" fontWeight="600" numberOfLines={2}>
            {entry.name}
          </Text>

          {/* Serving Info */}
          <Text fontSize="$3" color="$gray11">
            {servingInfo}
          </Text>

          {/* Meal Type (if set) */}
          {entry.meal_type && (
            <Text
              fontSize="$2"
              color="$blue10"
              textTransform="capitalize"
              marginTop="$1"
            >
              {entry.meal_type}
            </Text>
          )}
        </YStack>

        {/* Calories Badge */}
        <YStack
          backgroundColor="$orange3"
          paddingHorizontal="$3"
          paddingVertical="$2"
          borderRadius="$3"
          alignItems="center"
        >
          <Text fontSize="$5" fontWeight="700" color="$orange10">
            {totalCalories}
          </Text>
          <Text fontSize="$2" color="$orange9">
            cal
          </Text>
        </YStack>
      </XStack>

      <Separator marginVertical="$2" />

      {/* Macro Summary */}
      <XStack justifyContent="space-around">
        <YStack alignItems="center">
          <Text fontSize="$3" fontWeight="600" color="$red10">
            {totalProtein}g
          </Text>
          <Text fontSize="$2" color="$gray10">
            protein
          </Text>
        </YStack>
        <YStack alignItems="center">
          <Text fontSize="$3" fontWeight="600" color="$blue10">
            {totalCarbs}g
          </Text>
          <Text fontSize="$2" color="$gray10">
            carbs
          </Text>
        </YStack>
        <YStack alignItems="center">
          <Text fontSize="$3" fontWeight="600" color="$yellow10">
            {totalFat}g
          </Text>
          <Text fontSize="$2" color="$gray10">
            fat
          </Text>
        </YStack>
      </XStack>

      {/* Sync Status Indicator */}
      {entry.sync_status === 'pending' && (
        <XStack marginTop="$2" justifyContent="flex-end">
          <Text fontSize="$1" color="$gray9">
            Pending sync
          </Text>
        </XStack>
      )}
    </Card>
  );
}
