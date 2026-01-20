/**
 * PictureGrid Component
 * Grid view of pictures for the review queue
 */

import { useCallback } from 'react';
import { FlatList, Dimensions, RefreshControl } from 'react-native';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { CheckCircle } from '@tamagui/lucide-icons';
import { PictureCard } from './PictureCard';
import type { Picture } from '../../db/schema';

const { width: screenWidth } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const SPACING = 8;
const CARD_SIZE = (screenWidth - SPACING * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

interface PictureGridProps {
  pictures: Picture[];
  isLoading: boolean;
  onRefresh: () => void;
  onPicturePress: (picture: Picture) => void;
  refreshing?: boolean;
}

export function PictureGrid({
  pictures,
  isLoading,
  onRefresh,
  onPicturePress,
  refreshing = false,
}: PictureGridProps) {
  const renderItem = useCallback(
    ({ item }: { item: Picture }) => (
      <YStack padding={SPACING / 2}>
        <PictureCard
          picture={item}
          onPress={onPicturePress}
          size={CARD_SIZE}
        />
      </YStack>
    ),
    [onPicturePress]
  );

  const keyExtractor = useCallback((item: Picture) => item.id, []);

  const ListEmptyComponent = useCallback(
    () => (
      <YStack
        flex={1}
        minHeight={300}
        alignItems="center"
        justifyContent="center"
        padding="$6"
      >
        <XStack
          backgroundColor="$green3"
          width={80}
          height={80}
          borderRadius="$6"
          alignItems="center"
          justifyContent="center"
          marginBottom="$4"
        >
          <CheckCircle size={40} color="$green10" />
        </XStack>
        <Text fontSize="$6" fontWeight="600" color="$gray12" marginBottom="$2">
          All caught up!
        </Text>
        <Text fontSize="$4" color="$gray10" textAlign="center">
          You have no pictures waiting for review
        </Text>
      </YStack>
    ),
    []
  );

  if (isLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner size="large" />
        <Text marginTop="$4" color="$gray11">
          Loading pictures...
        </Text>
      </YStack>
    );
  }

  return (
    <FlatList
      data={pictures}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={NUM_COLUMNS}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        padding: SPACING / 2,
        flexGrow: 1,
      }}
      ListEmptyComponent={ListEmptyComponent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    />
  );
}
