/**
 * Food Search Screen
 * Search USDA FoodData Central for food items
 */

import { useState, useCallback } from 'react';
import { FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, Text, Spinner, Button, XStack, Input, Sheet } from 'tamagui';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FoodSearchInput, FoodSearchResult } from '../../../components/food';
import {
  searchFoods,
  type FoodSearchResult as FoodSearchResultType,
} from '../../../services/food-search';

export default function FoodSearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodSearchResultType | null>(
    null
  );
  const [servings, setServings] = useState('1');
  const [sheetOpen, setSheetOpen] = useState(false);

  // Search query
  const {
    data: searchResults,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['foodSearch', searchQuery],
    queryFn: () => searchFoods(searchQuery),
    enabled: searchQuery.trim().length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleFoodSelect = useCallback((food: FoodSearchResultType) => {
    setSelectedFood(food);
    setServings('1');
    setSheetOpen(true);
  }, []);

  const handleConfirmSelection = useCallback(() => {
    if (!selectedFood) return;

    const servingsNum = parseFloat(servings) || 1;

    // Navigate to add screen with pre-filled data
    router.push({
      pathname: '/(auth)/food/add',
      params: {
        name: selectedFood.description,
        calories: String(selectedFood.nutrients.calories),
        protein_g: String(selectedFood.nutrients.protein),
        carbs_g: String(selectedFood.nutrients.carbs),
        fat_g: String(selectedFood.nutrients.fat),
        fiber_g: String(selectedFood.nutrients.fiber || 0),
        serving_size: String(selectedFood.servingSize || 100),
        serving_unit: selectedFood.servingSizeUnit || 'g',
        servings: String(servingsNum),
        external_food_id: selectedFood.fdcId,
        external_source: 'usda',
        brand_name: selectedFood.brandName || '',
      },
    });

    setSheetOpen(false);
    setSelectedFood(null);
  }, [selectedFood, servings, router]);

  const handleManualEntry = useCallback(() => {
    router.push('/(auth)/food/add');
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: FoodSearchResultType }) => (
      <FoodSearchResult food={item} onPress={handleFoodSelect} />
    ),
    [handleFoodSelect]
  );

  const keyExtractor = useCallback(
    (item: FoodSearchResultType) => item.fdcId,
    []
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <YStack flex={1} padding="$4" backgroundColor="$background">
        {/* Search Input */}
        <FoodSearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSearch={handleSearch}
          isLoading={isLoading}
          placeholder="Search foods (e.g., chicken breast, apple)"
        />

        {/* Manual Entry Button */}
        <XStack marginTop="$2" justifyContent="flex-end">
          <Button size="$3" variant="outlined" onPress={handleManualEntry}>
            Manual Entry
          </Button>
        </XStack>

        {/* Results */}
        <YStack flex={1} marginTop="$3">
          {error ? (
            <YStack flex={1} justifyContent="center" alignItems="center">
              <Text color="$red10" textAlign="center">
                Error searching foods. Please try again.
              </Text>
              <Button marginTop="$3" onPress={() => refetch()}>
                Retry
              </Button>
            </YStack>
          ) : searchQuery.trim().length < 2 ? (
            <YStack flex={1} justifyContent="center" alignItems="center">
              <Text color="$gray10" textAlign="center">
                Enter at least 2 characters to search
              </Text>
            </YStack>
          ) : isLoading ? (
            <YStack flex={1} justifyContent="center" alignItems="center">
              <Spinner size="large" />
              <Text marginTop="$2" color="$gray10">
                Searching...
              </Text>
            </YStack>
          ) : searchResults && searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          ) : (
            <YStack flex={1} justifyContent="center" alignItems="center">
              <Text color="$gray10" textAlign="center">
                No foods found for "{searchQuery}"
              </Text>
              <Button marginTop="$3" onPress={handleManualEntry}>
                Add Manually
              </Button>
            </YStack>
          )}
        </YStack>

        {/* Serving Size Selection Sheet */}
        <Sheet
          modal
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          snapPoints={[50]}
          dismissOnSnapToBottom
        >
          <Sheet.Overlay />
          <Sheet.Frame padding="$4">
            <Sheet.Handle />

            {selectedFood && (
              <YStack gap="$4" marginTop="$4">
                <Text fontSize="$5" fontWeight="600" numberOfLines={2}>
                  {selectedFood.description}
                </Text>
                {selectedFood.brandName && (
                  <Text fontSize="$3" color="$gray11">
                    {selectedFood.brandName}
                  </Text>
                )}

                {/* Serving Info */}
                <YStack gap="$2">
                  <Text fontSize="$3" fontWeight="500">
                    Serving Size
                  </Text>
                  <Text fontSize="$4" color="$gray11">
                    {selectedFood.servingSize || 100}
                    {selectedFood.servingSizeUnit || 'g'}
                  </Text>
                </YStack>

                {/* Servings Input */}
                <YStack gap="$2">
                  <Text fontSize="$3" fontWeight="500">
                    Number of Servings
                  </Text>
                  <Input
                    value={servings}
                    onChangeText={setServings}
                    keyboardType="decimal-pad"
                    placeholder="1"
                    size="$4"
                  />
                </YStack>

                {/* Calculated Macros */}
                <YStack
                  backgroundColor="$gray2"
                  padding="$3"
                  borderRadius="$3"
                  gap="$2"
                >
                  <Text fontSize="$3" fontWeight="500">
                    Total Nutrition ({parseFloat(servings) || 1} serving
                    {(parseFloat(servings) || 1) !== 1 ? 's' : ''})
                  </Text>
                  <XStack justifyContent="space-around">
                    <YStack alignItems="center">
                      <Text
                        fontSize="$4"
                        fontWeight="600"
                        color="$orange10"
                      >
                        {Math.round(
                          selectedFood.nutrients.calories *
                            (parseFloat(servings) || 1)
                        )}
                      </Text>
                      <Text fontSize="$2" color="$gray10">
                        cal
                      </Text>
                    </YStack>
                    <YStack alignItems="center">
                      <Text fontSize="$4" fontWeight="600" color="$red10">
                        {Math.round(
                          selectedFood.nutrients.protein *
                            (parseFloat(servings) || 1)
                        )}
                        g
                      </Text>
                      <Text fontSize="$2" color="$gray10">
                        protein
                      </Text>
                    </YStack>
                    <YStack alignItems="center">
                      <Text fontSize="$4" fontWeight="600" color="$blue10">
                        {Math.round(
                          selectedFood.nutrients.carbs *
                            (parseFloat(servings) || 1)
                        )}
                        g
                      </Text>
                      <Text fontSize="$2" color="$gray10">
                        carbs
                      </Text>
                    </YStack>
                    <YStack alignItems="center">
                      <Text
                        fontSize="$4"
                        fontWeight="600"
                        color="$yellow10"
                      >
                        {Math.round(
                          selectedFood.nutrients.fat *
                            (parseFloat(servings) || 1)
                        )}
                        g
                      </Text>
                      <Text fontSize="$2" color="$gray10">
                        fat
                      </Text>
                    </YStack>
                  </XStack>
                </YStack>

                {/* Action Buttons */}
                <XStack gap="$3">
                  <Button
                    flex={1}
                    variant="outlined"
                    onPress={() => setSheetOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    flex={1}
                    theme="active"
                    onPress={handleConfirmSelection}
                  >
                    Add Food
                  </Button>
                </XStack>
              </YStack>
            )}
          </Sheet.Frame>
        </Sheet>
      </YStack>
    </SafeAreaView>
  );
}
