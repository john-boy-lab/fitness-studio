import React, { useState, useEffect } from 'react';
import { Alert, Platform, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  Button,
  Label,
  Spinner,
  Image,
  ScrollView,
} from 'tamagui';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Save,
  X,
  Calendar,
  ArrowLeft,
  SkipForward,
} from '@tamagui/lucide-icons';
import { WeightInput } from '../../../components/weight';
import { usePictures } from '../../../hooks/usePictures';
import { useWeight } from '../../../hooks/useWeight';

const screenWidth = Dimensions.get('window').width;

// Validation schema for weight review
const weightReviewSchema = z.object({
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
});

type WeightReviewFormData = z.infer<typeof weightReviewSchema>;

export default function PictureReviewScreen() {
  const router = useRouter();
  const { id, type } = useLocalSearchParams<{ id: string; type?: string }>();
  const { usePicture, markAsReviewed, skipReview } = usePictures();
  const { createWeightEntry } = useWeight();
  const { data: picture, isLoading, error } = usePicture(id || '');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const pictureType = type || picture?.picture_type || 'weight';

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<WeightReviewFormData>({
    resolver: zodResolver(weightReviewSchema),
    defaultValues: {
      weight_lbs: '',
      recorded_at: new Date(),
    },
  });

  const recordedAt = watch('recorded_at');

  // Set initial timestamp from EXIF data if available
  useEffect(() => {
    if (picture?.exif_timestamp) {
      setValue('recorded_at', new Date(picture.exif_timestamp));
    }
  }, [picture, setValue]);

  const onSubmit = async (data: WeightReviewFormData) => {
    if (!id || !picture) return;

    setIsSaving(true);
    try {
      // Create weight entry linked to this picture
      await createWeightEntry.mutateAsync({
        weight_lbs: parseFloat(data.weight_lbs),
        recorded_at: data.recorded_at.toISOString(),
        picture_id: id,
      });

      // Mark picture as reviewed
      await markAsReviewed.mutateAsync(id);

      router.back();
    } catch (err) {
      Alert.alert('Error', 'Failed to save. Please try again.');
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!id) return;

    Alert.alert(
      'Skip Review',
      'This photo will be marked as skipped. You can still review it later from your photo library.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: async () => {
            setIsSkipping(true);
            try {
              await skipReview.mutateAsync(id);
              router.back();
            } catch (err) {
              Alert.alert('Error', 'Failed to skip. Please try again.');
              setIsSkipping(false);
            }
          },
        },
      ]
    );
  };

  const handleDateChange = (event: unknown, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setValue('recorded_at', selectedDate);
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (isLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner size="large" />
        <Text marginTop="$4" color="$gray11">
          Loading photo...
        </Text>
      </YStack>
    );
  }

  if (error || !picture) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
        <Text fontSize="$6" fontWeight="600" color="$red10">
          Photo Not Found
        </Text>
        <Text color="$gray11" textAlign="center" marginTop="$2">
          The photo you're looking for doesn't exist or has been deleted.
        </Text>
        <Button marginTop="$4" onPress={() => router.back()}>
          Go Back
        </Button>
      </YStack>
    );
  }

  // Render based on picture type
  if (pictureType === 'weight') {
    return (
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
        <XStack
          padding="$4"
          alignItems="center"
          gap="$3"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
        >
          <Button
            size="$3"
            circular
            chromeless
            icon={<ArrowLeft size={24} />}
            onPress={() => router.back()}
          />
          <YStack flex={1}>
            <Text fontSize="$6" fontWeight="700">
              Review Weight Photo
            </Text>
            <Text fontSize="$3" color="$gray11">
              Enter the weight shown on the scale
            </Text>
          </YStack>
        </XStack>

        <ScrollView flex={1}>
          {/* Full-screen Picture Display */}
          <YStack
            backgroundColor="$gray2"
            height={screenWidth * 0.75}
            alignItems="center"
            justifyContent="center"
          >
            <Image
              source={{ uri: picture.storage_path }}
              width={screenWidth}
              height={screenWidth * 0.75}
              resizeMode="contain"
            />
          </YStack>

          {/* Review Form */}
          <YStack padding="$4" gap="$4">
            {/* EXIF Timestamp Info */}
            {picture.exif_timestamp && (
              <XStack
                backgroundColor="$blue3"
                padding="$3"
                borderRadius="$3"
                alignItems="center"
                gap="$2"
              >
                <Calendar size={18} color="$blue10" />
                <Text fontSize="$3" color="$blue11">
                  Photo taken:{' '}
                  {new Date(picture.exif_timestamp).toLocaleString()}
                </Text>
              </XStack>
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
                  placeholder="Enter weight from scale"
                />
              )}
            />

            {/* Timestamp (editable) */}
            <YStack gap="$2">
              <Label fontSize="$4" fontWeight="600">
                Recorded At
              </Label>
              <Button
                size="$4"
                variant="outlined"
                onPress={() => setShowDatePicker(true)}
                icon={<Calendar size={18} />}
                justifyContent="flex-start"
              >
                {formatDateTime(recordedAt)}
              </Button>
              <Text fontSize="$2" color="$gray10">
                You can adjust if the photo time is incorrect
              </Text>
            </YStack>

            {showDatePicker && (
              <DateTimePicker
                value={recordedAt}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}

            {/* Action Buttons */}
            <YStack gap="$3" marginTop="$4">
              <Button
                size="$5"
                theme="blue"
                onPress={handleSubmit(onSubmit)}
                disabled={isSaving || isSkipping}
                icon={isSaving ? <Spinner size="small" /> : <Save size={20} />}
              >
                {isSaving ? 'Saving...' : 'Save Weight Entry'}
              </Button>

              <Button
                size="$5"
                variant="outlined"
                onPress={handleSkip}
                disabled={isSaving || isSkipping}
                icon={
                  isSkipping ? (
                    <Spinner size="small" />
                  ) : (
                    <SkipForward size={20} />
                  )
                }
              >
                {isSkipping ? 'Skipping...' : 'Skip'}
              </Button>
            </YStack>
          </YStack>
        </ScrollView>
      </YStack>
    );
  }

  // Default fallback for other picture types (food will be handled in Sprint 4)
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
      <Text fontSize="$6" fontWeight="600">
        Unsupported Picture Type
      </Text>
      <Text color="$gray11" textAlign="center" marginTop="$2">
        Review for {pictureType} pictures is not yet implemented.
      </Text>
      <Button marginTop="$4" onPress={() => router.back()}>
        Go Back
      </Button>
    </YStack>
  );
}
