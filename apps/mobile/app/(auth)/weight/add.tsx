import React, { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  Button,
  TextArea,
  Label,
  ScrollView,
  Spinner,
} from 'tamagui';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Camera, Calendar, Save } from '@tamagui/lucide-icons';
import { WeightInput } from '../../../components/weight';
import { useWeight } from '../../../hooks/useWeight';

// Validation schema
const weightEntrySchema = z.object({
  weight_lbs: z
    .string()
    .min(1, 'Weight is required')
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 50 && num <= 1000;
      },
      { message: 'Weight must be between 50 and 1000 lbs' }
    ),
  recorded_at: z.date(),
  notes: z.string().max(500).optional(),
});

type WeightEntryFormData = z.infer<typeof weightEntrySchema>;

export default function AddWeightScreen() {
  const router = useRouter();
  const { createWeightEntry } = useWeight();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<WeightEntryFormData>({
    resolver: zodResolver(weightEntrySchema),
    defaultValues: {
      weight_lbs: '',
      recorded_at: new Date(),
      notes: '',
    },
  });

  const recordedAt = watch('recorded_at');

  const onSubmit = async (data: WeightEntryFormData) => {
    try {
      await createWeightEntry.mutateAsync({
        weight_lbs: parseFloat(data.weight_lbs),
        recorded_at: data.recorded_at.toISOString(),
        notes: data.notes || null,
      });

      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save weight entry. Please try again.');
    }
  };

  const handleCameraPress = () => {
    // Navigate to camera for weight photo
    router.push('/weight/camera');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleDateChange = (event: unknown, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const currentDate = recordedAt;
      selectedDate.setHours(currentDate.getHours());
      selectedDate.setMinutes(currentDate.getMinutes());
      setValue('recorded_at', selectedDate);
    }
  };

  const handleTimeChange = (event: unknown, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const currentDate = recordedAt;
      currentDate.setHours(selectedTime.getHours());
      currentDate.setMinutes(selectedTime.getMinutes());
      setValue('recorded_at', new Date(currentDate));
    }
  };

  return (
    <ScrollView flex={1} backgroundColor="$background">
      <YStack padding="$4" gap="$4">
        {/* Header */}
        <YStack gap="$2">
          <Text fontSize="$8" fontWeight="700">
            Log Weight
          </Text>
          <Text fontSize="$4" color="$gray11">
            Enter your weight manually or take a photo of your scale
          </Text>
        </YStack>

        {/* Weight Input */}
        <Controller
          control={control}
          name="weight_lbs"
          render={({ field: { onChange, value } }) => (
            <WeightInput
              value={value}
              onChange={onChange}
              error={errors.weight_lbs?.message}
              label="Weight"
              placeholder="175.5"
            />
          )}
        />

        {/* Camera Button */}
        <Button
          size="$5"
          variant="outlined"
          onPress={handleCameraPress}
          icon={<Camera size={20} />}
        >
          Take Photo of Scale
        </Button>

        {/* Date/Time Picker */}
        <YStack gap="$2">
          <Label fontSize="$4" fontWeight="600">
            Date & Time
          </Label>
          <XStack gap="$2">
            <Button
              flex={1}
              variant="outlined"
              onPress={() => setShowDatePicker(true)}
              icon={<Calendar size={18} />}
            >
              {formatDate(recordedAt)}
            </Button>
            <Button
              flex={1}
              variant="outlined"
              onPress={() => setShowTimePicker(true)}
            >
              {formatTime(recordedAt)}
            </Button>
          </XStack>
        </YStack>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={recordedAt}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Time Picker Modal */}
        {showTimePicker && (
          <DateTimePicker
            value={recordedAt}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}

        {/* Notes */}
        <YStack gap="$2">
          <Label fontSize="$4" fontWeight="600">
            Notes (optional)
          </Label>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <TextArea
                placeholder="Add any notes about this weight entry..."
                value={value}
                onChangeText={onChange}
                numberOfLines={3}
                maxLength={500}
              />
            )}
          />
          {errors.notes && (
            <Text color="$red10" fontSize="$2">
              {errors.notes.message}
            </Text>
          )}
        </YStack>

        {/* Save Button */}
        <Button
          size="$5"
          theme="blue"
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          icon={isSubmitting ? <Spinner size="small" /> : <Save size={20} />}
          marginTop="$4"
        >
          {isSubmitting ? 'Saving...' : 'Save Weight Entry'}
        </Button>
      </YStack>
    </ScrollView>
  );
}
