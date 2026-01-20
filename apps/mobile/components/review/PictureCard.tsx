/**
 * PictureCard Component
 * Single picture card in the review grid with type badge overlay
 */

import { YStack, XStack, Text, Image, Card } from 'tamagui';
import { Scale, UtensilsCrossed } from '@tamagui/lucide-icons';
import type { Picture } from '../../db/schema';

interface PictureCardProps {
  picture: Picture;
  onPress: (picture: Picture) => void;
  size?: number;
}

export function PictureCard({ picture, onPress, size = 120 }: PictureCardProps) {
  const isWeight = picture.picture_type === 'weight';
  const TypeIcon = isWeight ? Scale : UtensilsCrossed;
  const badgeColor = isWeight ? '$blue10' : '$orange10';

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const timestamp = picture.exif_timestamp || picture.created_at;

  return (
    <Card
      width={size}
      height={size + 40}
      overflow="hidden"
      borderRadius="$3"
      pressStyle={{ scale: 0.96, opacity: 0.9 }}
      animation="quick"
      onPress={() => onPress(picture)}
    >
      {/* Image */}
      <YStack position="relative" width={size} height={size}>
        <Image
          source={{ uri: picture.storage_path }}
          width={size}
          height={size}
          resizeMode="cover"
        />

        {/* Type Badge Overlay */}
        <XStack
          position="absolute"
          top="$2"
          right="$2"
          backgroundColor={badgeColor}
          paddingHorizontal="$1.5"
          paddingVertical="$1"
          borderRadius="$2"
          alignItems="center"
          gap="$1"
        >
          <TypeIcon size={12} color="white" />
        </XStack>
      </YStack>

      {/* Date/Time */}
      <YStack
        padding="$2"
        backgroundColor="$background"
        flex={1}
        justifyContent="center"
      >
        <Text fontSize="$2" color="$gray11" numberOfLines={1}>
          {formatDate(timestamp)}
        </Text>
        <Text fontSize="$1" color="$gray9" numberOfLines={1}>
          {formatTime(timestamp)}
        </Text>
      </YStack>
    </Card>
  );
}
