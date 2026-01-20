import React from 'react';
import { useRouter } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  Button,
  ScrollView,
  Spinner,
  Card,
  Image,
} from 'tamagui';
import { Camera, Scale, UtensilsCrossed, ArrowRight } from '@tamagui/lucide-icons';
import { usePictures, useUnreviewedCount } from '../../../hooks/usePictures';

export default function ReviewQueueScreen() {
  const router = useRouter();
  const {
    unreviewedWeightPictures,
    isLoadingWeightPictures,
    refetchWeightPictures,
  } = usePictures();
  const { data: weightCount = 0 } = useUnreviewedCount('weight');
  const { data: foodCount = 0 } = useUnreviewedCount('food');

  const totalCount = weightCount + foodCount;

  const handleReviewWeightPhoto = (id: string) => {
    router.push(`/review/${id}?type=weight`);
  };

  const handleReviewNextWeight = () => {
    if (unreviewedWeightPictures.length > 0) {
      handleReviewWeightPhoto(unreviewedWeightPictures[0].id);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <YStack padding="$4" paddingBottom="$2">
        <Text fontSize="$8" fontWeight="700">
          Review Queue
        </Text>
        <Text fontSize="$4" color="$gray11">
          {totalCount > 0
            ? `${totalCount} photo${totalCount !== 1 ? 's' : ''} awaiting review`
            : 'All caught up!'}
        </Text>
      </YStack>

      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack padding="$4" paddingTop="$2" gap="$4">
          {/* Weight Photos Section */}
          <YStack gap="$3">
            <XStack alignItems="center" justifyContent="space-between">
              <XStack alignItems="center" gap="$2">
                <Scale size={20} color="$blue10" />
                <Text fontSize="$5" fontWeight="600">
                  Weight Photos
                </Text>
                {weightCount > 0 && (
                  <XStack
                    backgroundColor="$blue10"
                    paddingHorizontal="$2"
                    paddingVertical="$1"
                    borderRadius="$4"
                  >
                    <Text fontSize="$2" color="white" fontWeight="600">
                      {weightCount}
                    </Text>
                  </XStack>
                )}
              </XStack>
              {weightCount > 0 && (
                <Button
                  size="$3"
                  theme="blue"
                  onPress={handleReviewNextWeight}
                  iconAfter={<ArrowRight size={16} />}
                >
                  Review Next
                </Button>
              )}
            </XStack>

            {isLoadingWeightPictures ? (
              <YStack alignItems="center" padding="$4">
                <Spinner size="small" />
              </YStack>
            ) : unreviewedWeightPictures.length === 0 ? (
              <Card
                padding="$4"
                backgroundColor="$gray2"
                borderRadius="$4"
                alignItems="center"
              >
                <Camera size={32} color="$gray9" />
                <Text color="$gray10" marginTop="$2" textAlign="center">
                  No weight photos to review
                </Text>
                <Button
                  size="$3"
                  marginTop="$3"
                  variant="outlined"
                  onPress={() => router.push('/weight/camera')}
                >
                  Take Weight Photo
                </Button>
              </Card>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {unreviewedWeightPictures.slice(0, 10).map((picture) => (
                  <Card
                    key={picture.id}
                    width={140}
                    height={180}
                    overflow="hidden"
                    pressStyle={{ scale: 0.98, opacity: 0.9 }}
                    onPress={() => handleReviewWeightPhoto(picture.id)}
                    animation="quick"
                  >
                    <Image
                      source={{ uri: picture.storage_path }}
                      width={140}
                      height={140}
                      resizeMode="cover"
                    />
                    <YStack
                      padding="$2"
                      backgroundColor="$background"
                      flex={1}
                      justifyContent="center"
                    >
                      <Text fontSize="$2" color="$gray11" numberOfLines={1}>
                        {picture.exif_timestamp
                          ? formatDate(picture.exif_timestamp)
                          : formatDate(picture.created_at)}
                      </Text>
                    </YStack>
                  </Card>
                ))}
                {unreviewedWeightPictures.length > 10 && (
                  <Card
                    width={140}
                    height={180}
                    backgroundColor="$gray3"
                    alignItems="center"
                    justifyContent="center"
                    borderRadius="$4"
                  >
                    <Text fontSize="$5" fontWeight="600" color="$gray10">
                      +{unreviewedWeightPictures.length - 10}
                    </Text>
                    <Text fontSize="$3" color="$gray9">
                      more
                    </Text>
                  </Card>
                )}
              </ScrollView>
            )}
          </YStack>

          {/* Food Photos Section (placeholder for Sprint 4) */}
          <YStack gap="$3">
            <XStack alignItems="center" gap="$2">
              <UtensilsCrossed size={20} color="$orange10" />
              <Text fontSize="$5" fontWeight="600">
                Food Photos
              </Text>
              {foodCount > 0 && (
                <XStack
                  backgroundColor="$orange10"
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  borderRadius="$4"
                >
                  <Text fontSize="$2" color="white" fontWeight="600">
                    {foodCount}
                  </Text>
                </XStack>
              )}
            </XStack>

            <Card
              padding="$4"
              backgroundColor="$gray2"
              borderRadius="$4"
              alignItems="center"
            >
              <UtensilsCrossed size={32} color="$gray9" />
              <Text color="$gray10" marginTop="$2" textAlign="center">
                {foodCount > 0
                  ? 'Food photo review coming soon'
                  : 'No food photos to review'}
              </Text>
            </Card>
          </YStack>

          {/* Quick Actions */}
          <YStack gap="$3" marginTop="$4">
            <Text fontSize="$4" fontWeight="600">
              Quick Actions
            </Text>
            <XStack gap="$3">
              <Button
                flex={1}
                size="$4"
                variant="outlined"
                onPress={() => router.push('/weight/add')}
                icon={<Scale size={18} />}
              >
                Log Weight
              </Button>
              <Button
                flex={1}
                size="$4"
                variant="outlined"
                onPress={() => router.push('/weight/camera')}
                icon={<Camera size={18} />}
              >
                Take Photo
              </Button>
            </XStack>
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
