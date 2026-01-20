/**
 * QuickActions Component
 * Grid of quick action buttons for common tasks
 */

import { XStack, YStack, Button, Text } from 'tamagui';
import { Scale, UtensilsCrossed, Camera, ClipboardList } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';

interface QuickActionsProps {
  unreviewedCount: number;
}

export function QuickActions({ unreviewedCount }: QuickActionsProps) {
  const router = useRouter();

  const handleAddWeight = () => {
    router.push('/(auth)/weight/add');
  };

  const handleAddFood = () => {
    router.push('/(auth)/food/search');
  };

  const handleTakePhoto = () => {
    router.push('/(auth)/weight/camera');
  };

  const handleReview = () => {
    router.push('/(auth)/review/');
  };

  return (
    <YStack gap="$3">
      <Text fontSize="$4" fontWeight="600" color="$gray12">
        Quick Actions
      </Text>
      <XStack gap="$3" flexWrap="wrap">
        <YStack flex={1} minWidth={100}>
          <Button
            size="$5"
            backgroundColor="$blue3"
            pressStyle={{ backgroundColor: '$blue4' }}
            borderRadius="$4"
            onPress={handleAddWeight}
          >
            <YStack alignItems="center" gap="$1">
              <Scale size={24} color="$blue10" />
              <Text fontSize="$2" color="$blue10" fontWeight="500">
                Log Weight
              </Text>
            </YStack>
          </Button>
        </YStack>

        <YStack flex={1} minWidth={100}>
          <Button
            size="$5"
            backgroundColor="$orange3"
            pressStyle={{ backgroundColor: '$orange4' }}
            borderRadius="$4"
            onPress={handleAddFood}
          >
            <YStack alignItems="center" gap="$1">
              <UtensilsCrossed size={24} color="$orange10" />
              <Text fontSize="$2" color="$orange10" fontWeight="500">
                Add Food
              </Text>
            </YStack>
          </Button>
        </YStack>

        <YStack flex={1} minWidth={100}>
          <Button
            size="$5"
            backgroundColor="$green3"
            pressStyle={{ backgroundColor: '$green4' }}
            borderRadius="$4"
            onPress={handleTakePhoto}
          >
            <YStack alignItems="center" gap="$1">
              <Camera size={24} color="$green10" />
              <Text fontSize="$2" color="$green10" fontWeight="500">
                Take Photo
              </Text>
            </YStack>
          </Button>
        </YStack>

        <YStack flex={1} minWidth={100} position="relative">
          <Button
            size="$5"
            backgroundColor="$purple3"
            pressStyle={{ backgroundColor: '$purple4' }}
            borderRadius="$4"
            onPress={handleReview}
          >
            <YStack alignItems="center" gap="$1">
              <ClipboardList size={24} color="$purple10" />
              <Text fontSize="$2" color="$purple10" fontWeight="500">
                Review
              </Text>
            </YStack>
          </Button>
          {/* Badge for unreviewed count */}
          {unreviewedCount > 0 && (
            <XStack
              position="absolute"
              top={-8}
              right={-8}
              backgroundColor="$red10"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$4"
              minWidth={24}
              alignItems="center"
              justifyContent="center"
              zIndex={1}
            >
              <Text fontSize="$1" fontWeight="700" color="white">
                {unreviewedCount > 99 ? '99+' : unreviewedCount}
              </Text>
            </XStack>
          )}
        </YStack>
      </XStack>
    </YStack>
  );
}
