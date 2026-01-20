import React, { useMemo } from 'react';
import { Dimensions } from 'react-native';
import { YStack, Text } from 'tamagui';
import { LineChart } from 'react-native-chart-kit';

interface WeightDataPoint {
  weight_lbs: number;
  recorded_at: string;
}

interface WeightChartProps {
  data: WeightDataPoint[];
  height?: number;
}

export function WeightChart({ data, height = 220 }: WeightChartProps) {
  const screenWidth = Dimensions.get('window').width - 32; // Account for padding

  const chartData = useMemo(() => {
    if (data.length === 0) {
      return null;
    }

    // Sort by date ascending
    const sorted = [...data].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );

    // Take last 30 entries max for readability
    const limited = sorted.slice(-30);

    // Format labels (show only a few dates)
    const labels = limited.map((entry, index) => {
      // Show label for first, last, and every 7th entry
      if (index === 0 || index === limited.length - 1 || index % 7 === 0) {
        const date = new Date(entry.recorded_at);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }
      return '';
    });

    const weights = limited.map((entry) => entry.weight_lbs);

    return {
      labels,
      datasets: [
        {
          data: weights,
          strokeWidth: 2,
        },
      ],
    };
  }, [data]);

  if (!chartData || data.length < 2) {
    return (
      <YStack
        height={height}
        backgroundColor="$gray3"
        borderRadius="$4"
        alignItems="center"
        justifyContent="center"
      >
        <Text color="$gray10" fontSize="$4">
          Not enough data to display chart
        </Text>
        <Text color="$gray9" fontSize="$2">
          Add at least 2 weight entries
        </Text>
      </YStack>
    );
  }

  // Calculate min/max for better chart scaling
  const weights = chartData.datasets[0].data;
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const padding = (maxWeight - minWeight) * 0.1 || 5; // 10% padding or 5 lbs minimum

  return (
    <YStack>
      <LineChart
        data={chartData}
        width={screenWidth}
        height={height}
        yAxisSuffix=" lbs"
        yAxisInterval={1}
        fromZero={false}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: '#3b82f6',
          },
          propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: '#e5e7eb',
            strokeWidth: 1,
          },
        }}
        bezier
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
        withVerticalLines={false}
        segments={4}
      />
    </YStack>
  );
}
