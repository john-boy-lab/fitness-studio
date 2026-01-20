/**
 * MacroBar Component
 * Mini horizontal progress bar for a single macro nutrient
 */

import { YStack, XStack, Text, Progress } from 'tamagui';

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  color?: string;
  showUnit?: boolean;
}

export function MacroBar({
  label,
  current,
  target,
  color = '$blue10',
  showUnit = true,
}: MacroBarProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const actualPercentage = target > 0 ? (current / target) * 100 : 0;
  const isOverTarget = actualPercentage > 100;

  return (
    <YStack gap="$1">
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$2" fontWeight="500" color="$gray11">
          {label}
        </Text>
        <Text
          fontSize="$2"
          fontWeight="500"
          color={isOverTarget ? '$red10' : '$gray11'}
        >
          {Math.round(current)}{showUnit ? 'g' : ''} / {target}{showUnit ? 'g' : ''}
        </Text>
      </XStack>
      <Progress
        value={percentage}
        backgroundColor="$gray4"
        height={6}
        borderRadius="$2"
      >
        <Progress.Indicator
          animation="bouncy"
          backgroundColor={isOverTarget ? '$red10' : color}
        />
      </Progress>
    </YStack>
  );
}
