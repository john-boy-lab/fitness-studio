import React from 'react';
import { Card, XStack, YStack, Text, Image } from 'tamagui';
import { Camera } from '@tamagui/lucide-icons';

interface WeightEntryCardProps {
  id: string;
  weight_lbs: number;
  recorded_at: string;
  notes?: string | null;
  picture?: {
    storage_path: string;
  } | null;
  onPress?: (id: string) => void;
}

export function WeightEntryCard({
  id,
  weight_lbs,
  recorded_at,
  notes,
  picture,
  onPress,
}: WeightEntryCardProps) {
  const date = new Date(recorded_at);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <Card
      elevate
      bordered
      padding="$3"
      marginVertical="$1"
      pressStyle={{ scale: 0.98, opacity: 0.9 }}
      onPress={() => onPress?.(id)}
      animation="quick"
    >
      <XStack justifyContent="space-between" alignItems="center">
        <XStack alignItems="center" gap="$3">
          {picture ? (
            <Image
              source={{ uri: picture.storage_path }}
              width={50}
              height={50}
              borderRadius="$2"
              backgroundColor="$gray5"
            />
          ) : (
            <YStack
              width={50}
              height={50}
              backgroundColor="$gray4"
              borderRadius="$2"
              alignItems="center"
              justifyContent="center"
            >
              <Camera size={24} color="$gray9" />
            </YStack>
          )}
          <YStack>
            <Text fontSize="$6" fontWeight="700">
              {weight_lbs.toFixed(1)} lbs
            </Text>
            <Text fontSize="$3" color="$gray11">
              {formattedDate} at {formattedTime}
            </Text>
            {notes && (
              <Text fontSize="$2" color="$gray10" numberOfLines={1}>
                {notes}
              </Text>
            )}
          </YStack>
        </XStack>
      </XStack>
    </Card>
  );
}
