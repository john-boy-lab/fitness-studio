/**
 * CalorieRing Component
 * Displays a circular progress ring for calories consumed vs target
 */

import { useMemo } from 'react';
import { YStack, Text, Circle } from 'tamagui';
import Svg, { Circle as SvgCircle } from 'react-native-svg';

interface CalorieRingProps {
  consumed: number;
  target: number;
  size?: number;
}

export function CalorieRing({ consumed, target, size = 160 }: CalorieRingProps) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const { percentage, strokeDashoffset, remaining, isOverTarget } = useMemo(() => {
    const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
    const offset = circumference - (pct / 100) * circumference;
    const rem = Math.max(0, target - consumed);
    const over = consumed > target;
    return {
      percentage: pct,
      strokeDashoffset: offset,
      remaining: rem,
      isOverTarget: over,
    };
  }, [consumed, target, circumference]);

  // Determine ring color based on progress
  const ringColor = isOverTarget
    ? '#ef4444' // red
    : percentage >= 80
    ? '#22c55e' // green
    : percentage >= 50
    ? '#f59e0b' // amber
    : '#3b82f6'; // blue

  return (
    <YStack alignItems="center" justifyContent="center">
      <YStack position="relative" width={size} height={size}>
        <Svg
          width={size}
          height={size}
          style={{ transform: [{ rotate: '-90deg' }] }}
        >
          {/* Background circle */}
          <SvgCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <SvgCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>

        {/* Center text */}
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          alignItems="center"
          justifyContent="center"
        >
          <Text
            fontSize="$7"
            fontWeight="700"
            color={isOverTarget ? '$red10' : '$gray12'}
          >
            {Math.round(consumed)}
          </Text>
          <Text fontSize="$3" color="$gray10">
            of {target} cal
          </Text>
        </YStack>
      </YStack>

      {/* Remaining text */}
      <YStack marginTop="$2" alignItems="center">
        {isOverTarget ? (
          <Text fontSize="$4" fontWeight="600" color="$red10">
            {Math.round(consumed - target)} over target
          </Text>
        ) : (
          <Text fontSize="$4" fontWeight="600" color="$green10">
            {Math.round(remaining)} remaining
          </Text>
        )}
      </YStack>
    </YStack>
  );
}
