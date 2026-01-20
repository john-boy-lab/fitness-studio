import React, { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  Button,
  ScrollView,
  Spinner,
  Select,
  Adapt,
  Sheet,
} from 'tamagui';
import { Plus, ChevronDown, Check } from '@tamagui/lucide-icons';
import {
  WeightChart,
  WeightEntryCard,
  TrendIndicator,
} from '../../../components/weight';
import { useWeight } from '../../../hooks/useWeight';

type DateRangeOption = '7d' | '30d' | '90d' | 'all';

const dateRangeOptions: { value: DateRangeOption; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

export default function WeightHistoryScreen() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRangeOption>('30d');
  const {
    weightEntries,
    isLoading,
    error,
    refetch,
    calculateTrend,
  } = useWeight();

  // Filter entries by date range
  const filteredEntries = useMemo(() => {
    if (dateRange === 'all') {
      return weightEntries;
    }

    const now = new Date();
    let daysBack: number;
    switch (dateRange) {
      case '7d':
        daysBack = 7;
        break;
      case '30d':
        daysBack = 30;
        break;
      case '90d':
        daysBack = 90;
        break;
      default:
        daysBack = 30;
    }

    const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    return weightEntries.filter(
      (entry) => new Date(entry.recorded_at) >= cutoffDate
    );
  }, [weightEntries, dateRange]);

  // Calculate trend from all entries (not just filtered)
  const trend = useMemo(() => {
    return calculateTrend(weightEntries);
  }, [weightEntries, calculateTrend]);

  const handleAddWeight = () => {
    router.push('/weight/add');
  };

  const handleEntryPress = (id: string) => {
    router.push(`/weight/${id}`);
  };

  if (isLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner size="large" />
        <Text marginTop="$4" color="$gray11">
          Loading weight history...
        </Text>
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
        <Text fontSize="$6" fontWeight="600" color="$red10">
          Error Loading Data
        </Text>
        <Text color="$gray11" textAlign="center" marginTop="$2">
          {error.message || 'Failed to load weight entries'}
        </Text>
        <Button marginTop="$4" onPress={() => refetch()}>
          Try Again
        </Button>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <XStack
        padding="$4"
        paddingBottom="$2"
        justifyContent="space-between"
        alignItems="center"
      >
        <YStack>
          <Text fontSize="$8" fontWeight="700">
            Weight
          </Text>
          <Text fontSize="$3" color="$gray11">
            Track your progress over time
          </Text>
        </YStack>
        <Button
          size="$4"
          theme="blue"
          circular
          icon={<Plus size={20} />}
          onPress={handleAddWeight}
        />
      </XStack>

      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack padding="$4" paddingTop="$2" gap="$4">
          {/* Trend Indicator */}
          {trend && (
            <TrendIndicator
              direction={trend.direction}
              change={trend.change}
              currentAverage={trend.currentAverage}
              showDetails
            />
          )}

          {/* Date Range Selector */}
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize="$4" fontWeight="600">
              Weight Chart
            </Text>
            <Select
              value={dateRange}
              onValueChange={(val) => setDateRange(val as DateRangeOption)}
              disablePreventBodyScroll
            >
              <Select.Trigger width={150} iconAfter={ChevronDown}>
                <Select.Value placeholder="Select range" />
              </Select.Trigger>

              <Adapt when="sm" platform="touch">
                <Sheet
                  native
                  modal
                  dismissOnSnapToBottom
                  animationConfig={{
                    type: 'spring',
                    damping: 20,
                    mass: 1.2,
                    stiffness: 250,
                  }}
                >
                  <Sheet.Frame>
                    <Sheet.ScrollView>
                      <Adapt.Contents />
                    </Sheet.ScrollView>
                  </Sheet.Frame>
                  <Sheet.Overlay
                    animation="lazy"
                    enterStyle={{ opacity: 0 }}
                    exitStyle={{ opacity: 0 }}
                  />
                </Sheet>
              </Adapt>

              <Select.Content>
                <Select.Viewport>
                  <Select.Group>
                    {dateRangeOptions.map((option, index) => (
                      <Select.Item
                        key={option.value}
                        index={index}
                        value={option.value}
                      >
                        <Select.ItemText>{option.label}</Select.ItemText>
                        <Select.ItemIndicator marginLeft="auto">
                          <Check size={16} />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Group>
                </Select.Viewport>
              </Select.Content>
            </Select>
          </XStack>

          {/* Weight Chart */}
          <WeightChart data={filteredEntries} />

          {/* Recent Entries */}
          <YStack gap="$2">
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize="$4" fontWeight="600">
                Recent Entries
              </Text>
              <Text fontSize="$3" color="$gray11">
                {filteredEntries.length} entries
              </Text>
            </XStack>

            {filteredEntries.length === 0 ? (
              <YStack
                padding="$6"
                alignItems="center"
                backgroundColor="$gray2"
                borderRadius="$4"
              >
                <Text fontSize="$5" fontWeight="500" color="$gray10">
                  No weight entries yet
                </Text>
                <Text color="$gray9" textAlign="center" marginTop="$2">
                  Start tracking your weight by tapping the + button above
                </Text>
                <Button marginTop="$4" onPress={handleAddWeight}>
                  Add First Entry
                </Button>
              </YStack>
            ) : (
              <YStack gap="$2">
                {filteredEntries.map((entry) => (
                  <WeightEntryCard
                    key={entry.id}
                    id={entry.id}
                    weight_lbs={entry.weight_lbs}
                    recorded_at={entry.recorded_at}
                    notes={entry.notes}
                    picture={entry.picture}
                    onPress={handleEntryPress}
                  />
                ))}
              </YStack>
            )}
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
