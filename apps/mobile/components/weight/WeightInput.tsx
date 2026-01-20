import React, { useState } from 'react';
import { Input, XStack, YStack, Text, Label } from 'tamagui';

interface WeightInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  placeholder?: string;
}

export function WeightInput({
  value,
  onChange,
  error,
  label = 'Weight',
  placeholder = '0.0',
}: WeightInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (text: string) => {
    // Allow only numbers and one decimal point
    // Match pattern like: 175, 175.5, 175.55
    const cleaned = text.replace(/[^0-9.]/g, '');

    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return;
    }

    // Limit to 1 decimal place
    if (parts.length === 2 && parts[1].length > 1) {
      return;
    }

    // Prevent leading zeros (except for decimals like 0.5)
    if (cleaned.length > 1 && cleaned[0] === '0' && cleaned[1] !== '.') {
      onChange(cleaned.slice(1));
      return;
    }

    onChange(cleaned);
  };

  return (
    <YStack gap="$2">
      {label && (
        <Label htmlFor="weight-input" fontSize="$4" fontWeight="600">
          {label}
        </Label>
      )}
      <XStack alignItems="center" gap="$2">
        <Input
          id="weight-input"
          flex={1}
          size="$5"
          placeholder={placeholder}
          value={value}
          onChangeText={handleChange}
          keyboardType="decimal-pad"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          borderColor={error ? '$red10' : isFocused ? '$blue10' : '$borderColor'}
          borderWidth={2}
          fontSize="$7"
          textAlign="center"
          fontWeight="600"
        />
        <Text fontSize="$5" fontWeight="500" color="$gray11">
          lbs
        </Text>
      </XStack>
      {error && (
        <Text color="$red10" fontSize="$2">
          {error}
        </Text>
      )}
    </YStack>
  );
}
