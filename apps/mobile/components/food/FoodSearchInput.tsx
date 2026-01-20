/**
 * FoodSearchInput Component
 * Debounced search input for food search functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { Input, XStack, Button, Spinner } from 'tamagui';
import { Search, X } from '@tamagui/lucide-icons';

interface FoodSearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSearch: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  debounceMs?: number;
}

export function FoodSearchInput({
  value,
  onChangeText,
  onSearch,
  isLoading = false,
  placeholder = 'Search foods...',
  debounceMs = 300,
}: FoodSearchInputProps) {
  const [localValue, setLocalValue] = useState(value);

  // Sync local value with prop
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced search
  useEffect(() => {
    const trimmed = localValue.trim();
    if (trimmed.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      onSearch(trimmed);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onSearch]);

  const handleChange = useCallback(
    (text: string) => {
      setLocalValue(text);
      onChangeText(text);
    },
    [onChangeText]
  );

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChangeText('');
  }, [onChangeText]);

  return (
    <XStack
      alignItems="center"
      backgroundColor="$background"
      borderRadius="$4"
      borderWidth={1}
      borderColor="$borderColor"
      paddingHorizontal="$3"
      paddingVertical="$2"
    >
      <Search size={20} color="$gray10" />
      <Input
        flex={1}
        value={localValue}
        onChangeText={handleChange}
        placeholder={placeholder}
        borderWidth={0}
        backgroundColor="transparent"
        paddingHorizontal="$2"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {isLoading ? (
        <Spinner size="small" />
      ) : localValue.length > 0 ? (
        <Button
          size="$2"
          circular
          chromeless
          onPress={handleClear}
          icon={<X size={16} />}
        />
      ) : null}
    </XStack>
  );
}
