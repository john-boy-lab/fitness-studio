/**
 * Food Log Screen
 * Daily food log with macro tracking and progress
 */

import { useState, useCallback, useMemo } from 'react';
import { FlatList, Platform } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { YStack, XStack, Text, Button, Spinner } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Calendar, ChevronLeft, ChevronRight, Search } from '@tamagui/lucide-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { FoodEntryCard, DailySummary } from '../../../components/food';
import { useFood } from '../../../hooks/useFood';
import type { FoodEntry } from '../../../db/schema';

// Default daily targets (could come from user profile)
const DEFAULT_TARGETS = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
  fiber: 30,
};

export default function FoodLogScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { useFoodEntriesByDate, useDailySummary } = useFood();

  // Get entries and summary for selected date
  const { data: entries, isLoading: entriesLoading } =
    useFoodEntriesByDate(selectedDate);
  const { data: summary } = useDailySummary(selectedDate);

  // Date navigation
  const goToPreviousDay = useCallback(() => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const handleDateChange = useCallback((event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  }, []);

  const handleEntryPress = useCallback(
    (entry: FoodEntry) => {
      router.push(`/(auth)/food/${entry.id}`);
    },
    [router]
  );

  const handleAddFood = useCallback(() => {
    router.push('/(auth)/food/add');
  }, [router]);

  const handleSearchFood = useCallback(() => {
    router.push('/(auth)/food/search');
  }, [router]);

  // Check if selected date is today
  const isToday = useMemo(() => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  }, [selectedDate]);

  // Format consumed macros for DailySummary
  const consumedMacros = useMemo(
    () => ({
      calories: summary?.totalCalories || 0,
      protein: summary?.totalProtein || 0,
      carbs: summary?.totalCarbs || 0,
      fat: summary?.totalFat || 0,
      fiber: summary?.totalFiber || 0,
    }),
    [summary]
  );

  const renderItem = useCallback(
    ({ item }: { item: FoodEntry }) => (
      <FoodEntryCard entry={item} onPress={handleEntryPress} />
    ),
    [handleEntryPress]
  );

  const keyExtractor = useCallback((item: FoodEntry) => item.id, []);

  const ListEmptyComponent = useCallback(
    () => (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$6">
        <Text color="$gray10" textAlign="center" marginBottom="$4">
          No food entries for this day
        </Text>
        <XStack gap="$3">
          <Button
            size="$4"
            theme="active"
            icon={<Plus size={20} />}
            onPress={handleAddFood}
          >
            Add Food
          </Button>
          <Button
            size="$4"
            variant="outlined"
            icon={<Search size={20} />}
            onPress={handleSearchFood}
          >
            Search
          </Button>
        </XStack>
      </YStack>
    ),
    [handleAddFood, handleSearchFood]
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <YStack flex={1} backgroundColor="$background">
        {/* Date Navigation Header */}
        <XStack
          padding="$3"
          alignItems="center"
          justifyContent="space-between"
          backgroundColor="$backgroundStrong"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
        >
          <Button
            size="$3"
            circular
            chromeless
            icon={<ChevronLeft size={24} />}
            onPress={goToPreviousDay}
          />

          <XStack alignItems="center" gap="$2">
            <Button
              size="$3"
              chromeless
              icon={<Calendar size={20} />}
              onPress={() => setShowDatePicker(true)}
            >
              <Text fontWeight="600">
                {selectedDate.toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </Button>
            {!isToday && (
              <Button size="$2" variant="outlined" onPress={goToToday}>
                Today
              </Button>
            )}
          </XStack>

          <Button
            size="$3"
            circular
            chromeless
            icon={<ChevronRight size={24} />}
            onPress={goToNextDay}
            disabled={isToday}
            opacity={isToday ? 0.3 : 1}
          />
        </XStack>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Content */}
        <YStack flex={1} padding="$3">
          {/* Daily Summary */}
          <DailySummary
            date={selectedDate}
            consumed={consumedMacros}
            targets={DEFAULT_TARGETS}
          />

          {/* Food Entries List */}
          <YStack flex={1}>
            <XStack
              justifyContent="space-between"
              alignItems="center"
              marginBottom="$2"
            >
              <Text fontSize="$4" fontWeight="600">
                Food Log
              </Text>
              <Text fontSize="$3" color="$gray10">
                {summary?.entryCount || 0} entries
              </Text>
            </XStack>

            {entriesLoading ? (
              <YStack flex={1} justifyContent="center" alignItems="center">
                <Spinner size="large" />
              </YStack>
            ) : (
              <FlatList
                data={entries || []}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                ListEmptyComponent={ListEmptyComponent}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  flexGrow: 1,
                  paddingBottom: 80, // Space for FAB
                }}
              />
            )}
          </YStack>
        </YStack>

        {/* FAB - Add Food Button */}
        <XStack
          position="absolute"
          bottom="$4"
          right="$4"
          gap="$2"
        >
          <Button
            size="$5"
            circular
            theme="active"
            icon={<Search size={24} />}
            onPress={handleSearchFood}
            elevate
          />
          <Button
            size="$5"
            circular
            theme="active"
            icon={<Plus size={24} />}
            onPress={handleAddFood}
            elevate
          />
        </XStack>
      </YStack>
    </SafeAreaView>
  );
}
