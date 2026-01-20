import React, { useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  Button,
  TextArea,
  Label,
  ScrollView,
  Spinner,
  Image,
} from 'tamagui';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Save,
  Trash2,
  Calendar,
  Camera,
  ArrowLeft,
} from '@tamagui/lucide-icons';
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

export default function WeightEntryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { useWeightEntry, updateWeightEntry, deleteWeightEntry } = useWeight();
  const { data: entry, isLoading, error } = useWeightEntry(id || '');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    setValue,
    watch,
    reset,
  } = useForm<WeightEntryFormData>({
    resolver: zodResolver(weightEntrySchema),
    defaultValues: {
      weight_lbs: '',
      recorded_at: new Date(),
      notes: '',
    },
  });

  const recordedAt = watch('recorded_at');

  // Populate form when entry loads
  useEffect(() => {
    if (entry) {
      reset({
        weight_lbs: entry.weight_lbs.toFixed(1),
        recorded_at: new Date(entry.recorded_at),
        notes: entry.notes || '',
      });
    }
  }, [entry, reset]);

  const onSubmit = async (data: WeightEntryFormData) => {
    if (!id) return;

    try {
      await updateWeightEntry.mutateAsync({
        id,
        data: {
          weight_lbs: parseFloat(data.weight_lbs),
          recorded_at: data.recorded_at.toISOString(),
          notes: data.notes || null,
        },
      });

      router.back();
    } catch (err) {
      Alert.alert('Error', 'Failed to update weight entry. Please try again.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this weight entry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            setIsDeleting(true);
            try {
              await deleteWeightEntry.mutateAsync(id);
              router.back();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete entry. Please try again.');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
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
      setValue('recorded_at', selectedDate, { shouldDirty: true });
    }
  };

  const handleTimeChange = (event: unknown, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const currentDate = new Date(recordedAt);
      currentDate.setHours(selectedTime.getHours());
      currentDate.setMinutes(selectedTime.getMinutes());
      setValue('recorded_at', currentDate, { shouldDirty: true });
    }
  };

  if (isLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner size="large" />
        <Text marginTop="$4" color="$gray11">
          Loading entry...
        </Text>
      </YStack>
    );
  }

  if (error || !entry) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
        <Text fontSize="$6" fontWeight="600" color="$red10">
          Entry Not Found
        </Text>
        <Text color="$gray11" textAlign="center" marginTop="$2">
          The weight entry you're looking for doesn't exist or has been deleted.
        </Text>
        <Button marginTop="$4" onPress={() => router.back()}>
          Go Back
        </Button>
      </YStack>
    );
  }

  return (
    <ScrollView flex={1} backgroundColor="$background">
      <YStack padding="$4" gap="$4">
        {/* Header */}
        <XStack alignItems="center" gap="$3">
          <Button
            size="$3"
            circular
            chromeless
            icon={<ArrowLeft size={24} />}
            onPress={() => router.back()}
          />
          <YStack flex={1}>
            <Text fontSize="$7" fontWeight="700">
              Edit Entry
            </Text>
            <Text fontSize="$3" color="$gray11">
              Modify your weight record
            </Text>
          </YStack>
        </XStack>

        {/* Picture Preview */}
        {entry.picture && (
          <YStack
            backgroundColor="$gray2"
            borderRadius="$4"
            overflow="hidden"
            height={200}
          >
            <Image
              source={{ uri: entry.picture.storage_path }}
              flex={1}
              resizeMode="cover"
            />
          </YStack>
        )}

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
            />
          )}
        />

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
            Notes
          </Label>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <TextArea
                placeholder="Add any notes..."
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

        {/* Sync Status */}
        <XStack alignItems="center" gap="$2">
          <Text fontSize="$3" color="$gray11">
            Sync status:
          </Text>
          <Text
            fontSize="$3"
            color={
              entry.sync_status === 'synced'
                ? '$green10'
                : entry.sync_status === 'pending'
                ? '$yellow10'
                : '$red10'
            }
            fontWeight="500"
          >
            {entry.sync_status.charAt(0).toUpperCase() + entry.sync_status.slice(1)}
          </Text>
        </XStack>

        {/* Action Buttons */}
        <YStack gap="$3" marginTop="$4">
          <Button
            size="$5"
            theme="blue"
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting || !isDirty}
            icon={isSubmitting ? <Spinner size="small" /> : <Save size={20} />}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>

          <Button
            size="$5"
            theme="red"
            variant="outlined"
            onPress={handleDelete}
            disabled={isDeleting}
            icon={isDeleting ? <Spinner size="small" /> : <Trash2 size={20} />}
          >
            {isDeleting ? 'Deleting...' : 'Delete Entry'}
          </Button>
        </YStack>
      </YStack>
    </ScrollView>
  );
}
