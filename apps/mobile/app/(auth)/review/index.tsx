/**
 * Review Queue Screen
 * Grid view of all unreviewed pictures with type badges
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, Button, ToggleGroup } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Scale, UtensilsCrossed, Layers } from '@tamagui/lucide-icons';
import { usePictures, useUnreviewedCount } from '../../../hooks/usePictures';
import { PictureGrid } from '../../../components/review';
import type { Picture } from '../../../db/schema';

type FilterType = 'all' | 'weight' | 'food';

export default function ReviewQueueScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const {
    allUnreviewedPictures,
    unreviewedWeightPictures,
    unreviewedFoodPictures,
    isLoadingAllPictures,
    isLoadingWeightPictures,
    isLoadingFoodPictures,
    refetchAllPictures,
    refetchWeightPictures,
    refetchFoodPictures,
  } = usePictures();

  const { data: weightCount = 0 } = useUnreviewedCount('weight');
  const { data: foodCount = 0 } = useUnreviewedCount('food');
  const totalCount = weightCount + foodCount;

  // Get pictures based on filter
  const displayedPictures = (() => {
    switch (filter) {
      case 'weight':
        return unreviewedWeightPictures;
      case 'food':
        return unreviewedFoodPictures;
      default:
        return allUnreviewedPictures;
    }
  })();

  const isLoading = (() => {
    switch (filter) {
      case 'weight':
        return isLoadingWeightPictures;
      case 'food':
        return isLoadingFoodPictures;
      default:
        return isLoadingAllPictures;
    }
  })();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchAllPictures(),
        refetchWeightPictures(),
        refetchFoodPictures(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchAllPictures, refetchWeightPictures, refetchFoodPictures]);

  const handlePicturePress = useCallback(
    (picture: Picture) => {
      router.push(`/(auth)/review/${picture.id}?type=${picture.picture_type}`);
    },
    [router]
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
        <YStack padding="$4" paddingBottom="$2">
          <Text fontSize="$8" fontWeight="700" color="$gray12">
            Review Queue
          </Text>
          <Text fontSize="$4" color="$gray11">
            {totalCount > 0
              ? `${totalCount} photo${totalCount !== 1 ? 's' : ''} awaiting review`
              : 'All caught up!'}
          </Text>
        </YStack>

        {/* Filter Tabs */}
        {totalCount > 0 && (
          <XStack paddingHorizontal="$4" paddingBottom="$3">
            <ToggleGroup
              type="single"
              value={filter}
              onValueChange={(val) => val && setFilter(val as FilterType)}
              flex={1}
            >
              <ToggleGroup.Item
                value="all"
                flex={1}
                backgroundColor={filter === 'all' ? '$blue5' : '$gray3'}
              >
                <XStack alignItems="center" gap="$1">
                  <Layers size={16} color={filter === 'all' ? '$blue10' : '$gray10'} />
                  <Text
                    fontSize="$3"
                    fontWeight="500"
                    color={filter === 'all' ? '$blue10' : '$gray10'}
                  >
                    All ({totalCount})
                  </Text>
                </XStack>
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="weight"
                flex={1}
                backgroundColor={filter === 'weight' ? '$blue5' : '$gray3'}
              >
                <XStack alignItems="center" gap="$1">
                  <Scale size={16} color={filter === 'weight' ? '$blue10' : '$gray10'} />
                  <Text
                    fontSize="$3"
                    fontWeight="500"
                    color={filter === 'weight' ? '$blue10' : '$gray10'}
                  >
                    Weight ({weightCount})
                  </Text>
                </XStack>
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="food"
                flex={1}
                backgroundColor={filter === 'food' ? '$orange5' : '$gray3'}
              >
                <XStack alignItems="center" gap="$1">
                  <UtensilsCrossed
                    size={16}
                    color={filter === 'food' ? '$orange10' : '$gray10'}
                  />
                  <Text
                    fontSize="$3"
                    fontWeight="500"
                    color={filter === 'food' ? '$orange10' : '$gray10'}
                  >
                    Food ({foodCount})
                  </Text>
                </XStack>
              </ToggleGroup.Item>
            </ToggleGroup>
          </XStack>
        )}

        {/* Picture Grid */}
        <YStack flex={1}>
          <PictureGrid
            pictures={displayedPictures}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            onPicturePress={handlePicturePress}
            refreshing={refreshing}
          />
        </YStack>

        {/* Quick Actions when no pictures */}
        {totalCount === 0 && !isLoading && (
          <YStack padding="$4" paddingTop={0} gap="$3">
            <Text fontSize="$4" fontWeight="600" color="$gray12">
              Take a photo to get started
            </Text>
            <XStack gap="$3">
              <Button
                flex={1}
                size="$4"
                theme="blue"
                icon={<Scale size={18} />}
                onPress={() => router.push('/(auth)/weight/camera')}
              >
                Weight Photo
              </Button>
              <Button
                flex={1}
                size="$4"
                theme="orange"
                icon={<UtensilsCrossed size={18} />}
                onPress={() => router.push('/(auth)/food/add')}
              >
                Food Photo
              </Button>
            </XStack>
          </YStack>
        )}
      </YStack>
    </SafeAreaView>
  );
}
