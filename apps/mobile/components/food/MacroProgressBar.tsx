/**
 * MacroProgressBar Component
 * Displays a progress bar for macro tracking with current vs target values
 */

import { YStack, XStack, Text, Progress } from 'tamagui';

interface MacroProgressBarProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  color?: string;
}

export function MacroProgressBar({
  label,
  current,
  target,
  unit = 'g',
  color = '$blue10',
}: MacroProgressBarProps) {
  // Calculate percentage (cap at 100 for display)
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const actualPercentage = target > 0 ? (current / target) * 100 : 0;

  // Determine if over target
  const isOverTarget = actualPercentage > 100;

  // Format values
  const currentDisplay = Number.isInteger(current)
    ? current
    : current.toFixed(1);
  const targetDisplay = Number.isInteger(target) ? target : target.toFixed(1);

  return (
    <YStack gap="$1">
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$3" fontWeight="500" color="$gray12">
          {label}
        </Text>
        <Text fontSize="$3" color={isOverTarget ? '$red10' : '$gray11'}>
          {currentDisplay}
          {unit} / {targetDisplay}
          {unit}
        </Text>
      </XStack>
      <Progress
        value={percentage}
        backgroundColor="$gray4"
        height={8}
        borderRadius="$2"
      >
        <Progress.Indicator
          animation="bouncy"
          backgroundColor={isOverTarget ? '$red10' : color}
        />
      </Progress>
      {isOverTarget && (
        <Text fontSize="$2" color="$red10" textAlign="right">
          {Math.round(actualPercentage - 100)}% over target
        </Text>
      )}
    </YStack>
  );
}
