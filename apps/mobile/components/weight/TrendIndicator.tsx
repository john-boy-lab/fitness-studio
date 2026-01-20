import React from 'react';
import { XStack, YStack, Text } from 'tamagui';
import { TrendingUp, TrendingDown, Minus } from '@tamagui/lucide-icons';

interface TrendIndicatorProps {
  direction: 'up' | 'down' | 'stable';
  change: number;
  currentAverage: number;
  showDetails?: boolean;
}

export function TrendIndicator({
  direction,
  change,
  currentAverage,
  showDetails = true,
}: TrendIndicatorProps) {
  const getIcon = () => {
    switch (direction) {
      case 'up':
        return <TrendingUp size={24} color="$red10" />;
      case 'down':
        return <TrendingDown size={24} color="$green10" />;
      case 'stable':
        return <Minus size={24} color="$blue10" />;
    }
  };

  const getColor = () => {
    switch (direction) {
      case 'up':
        return '$red10';
      case 'down':
        return '$green10';
      case 'stable':
        return '$blue10';
    }
  };

  const getLabel = () => {
    switch (direction) {
      case 'up':
        return 'Trending Up';
      case 'down':
        return 'Trending Down';
      case 'stable':
        return 'Stable';
    }
  };

  const getChangeText = () => {
    if (direction === 'stable') {
      return 'No significant change';
    }
    const prefix = change > 0 ? '+' : '';
    return `${prefix}${change.toFixed(1)} lbs`;
  };

  return (
    <XStack
      backgroundColor="$background"
      borderRadius="$4"
      padding="$3"
      alignItems="center"
      gap="$3"
      borderWidth={1}
      borderColor="$borderColor"
    >
      {getIcon()}
      <YStack flex={1}>
        <XStack alignItems="center" gap="$2">
          <Text fontSize="$4" fontWeight="600" color={getColor()}>
            {getLabel()}
          </Text>
          <Text fontSize="$3" color="$gray10">
            ({getChangeText()})
          </Text>
        </XStack>
        {showDetails && (
          <Text fontSize="$2" color="$gray11">
            7-day average: {currentAverage.toFixed(1)} lbs
          </Text>
        )}
      </YStack>
    </XStack>
  );
}
