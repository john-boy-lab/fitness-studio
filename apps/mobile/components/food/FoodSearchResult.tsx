/**
 * FoodSearchResult Component
 * Displays a single food search result item
 */

import { YStack, XStack, Text, Card, Separator } from 'tamagui';
import type { FoodSearchResult as FoodSearchResultType } from '../../services/food-search';

interface FoodSearchResultProps {
  food: FoodSearchResultType;
  onPress: (food: FoodSearchResultType) => void;
}

export function FoodSearchResult({ food, onPress }: FoodSearchResultProps) {
  const handlePress = () => {
    onPress(food);
  };

  // Format serving size display
  const servingDisplay = food.servingSize
    ? `${food.servingSize}${food.servingSizeUnit || 'g'}`
    : 'per 100g';

  return (
    <Card
      elevate
      bordered
      pressStyle={{ scale: 0.98, opacity: 0.9 }}
      onPress={handlePress}
      marginVertical="$1"
      padding="$3"
    >
      <YStack gap="$1">
        {/* Food Name */}
        <Text fontSize="$4" fontWeight="600" numberOfLines={2}>
          {food.description}
        </Text>

        {/* Brand Name (if available) */}
        {food.brandName && (
          <Text fontSize="$3" color="$gray11" numberOfLines={1}>
            {food.brandName}
            {food.brandOwner && ` - ${food.brandOwner}`}
          </Text>
        )}

        <Separator marginVertical="$2" />

        {/* Nutrition Info */}
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize="$3" color="$gray11">
            {servingDisplay}
          </Text>
          <XStack gap="$3">
            <YStack alignItems="center">
              <Text fontSize="$3" fontWeight="600" color="$orange10">
                {Math.round(food.nutrients.calories)}
              </Text>
              <Text fontSize="$2" color="$gray10">
                cal
              </Text>
            </YStack>
            <YStack alignItems="center">
              <Text fontSize="$3" fontWeight="600" color="$red10">
                {Math.round(food.nutrients.protein)}g
              </Text>
              <Text fontSize="$2" color="$gray10">
                protein
              </Text>
            </YStack>
            <YStack alignItems="center">
              <Text fontSize="$3" fontWeight="600" color="$blue10">
                {Math.round(food.nutrients.carbs)}g
              </Text>
              <Text fontSize="$2" color="$gray10">
                carbs
              </Text>
            </YStack>
            <YStack alignItems="center">
              <Text fontSize="$3" fontWeight="600" color="$yellow10">
                {Math.round(food.nutrients.fat)}g
              </Text>
              <Text fontSize="$2" color="$gray10">
                fat
              </Text>
            </YStack>
          </XStack>
        </XStack>
      </YStack>
    </Card>
  );
}
