import React, { useState, useEffect } from 'react';
import { Alert, Image as RNImage } from 'react-native';
import { useRouter } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  Button,
  Image,
  Spinner,
} from 'tamagui';
import { Camera, ImageIcon, X, Check, RefreshCw } from '@tamagui/lucide-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import {
  takeWeightPhoto,
  pickWeightPhoto,
  requestCameraPermissions,
} from '../../../services/camera';
import { WeightInput } from '../../../components/weight';
import { useWeight } from '../../../hooks/useWeight';

// Validation schema
const weightPhotoSchema = z.object({
  weight_lbs: z.string().optional(),
  recorded_at: z.date(),
});

type WeightPhotoFormData = z.infer<typeof weightPhotoSchema>;

// Mock user ID - will be replaced with actual auth
const getUserId = () => 'mock-user-id';

export default function WeightCameraScreen() {
  const router = useRouter();
  const { createWeightEntry } = useWeight();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [pictureId, setPictureId] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WeightPhotoFormData>({
    resolver: zodResolver(weightPhotoSchema),
    defaultValues: {
      weight_lbs: '',
      recorded_at: new Date(),
    },
  });

  const recordedAt = watch('recorded_at');

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const granted = await requestCameraPermissions();
    setHasPermission(granted);
  };

  const handleTakePhoto = async () => {
    setIsCapturing(true);
    try {
      const result = await takeWeightPhoto(getUserId());
      if (result) {
        setPhotoUri(result.uri);
        setPictureId(result.pictureId);

        // Auto-populate recorded_at from EXIF timestamp if available
        if (result.exifTimestamp) {
          setValue('recorded_at', new Date(result.exifTimestamp));
        }
      }
    } catch (error) {
      Alert.alert(
        'Camera Error',
        error instanceof Error ? error.message : 'Failed to capture photo'
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePickPhoto = async () => {
    setIsCapturing(true);
    try {
      const result = await pickWeightPhoto(getUserId());
      if (result) {
        setPhotoUri(result.uri);
        setPictureId(result.pictureId);

        // Auto-populate recorded_at from EXIF timestamp if available
        if (result.exifTimestamp) {
          setValue('recorded_at', new Date(result.exifTimestamp));
        }
      }
    } catch (error) {
      Alert.alert(
        'Library Error',
        error instanceof Error ? error.message : 'Failed to pick photo'
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetake = () => {
    setPhotoUri(null);
    setPictureId(null);
    setValue('weight_lbs', '');
    setValue('recorded_at', new Date());
  };

  const onSubmit = async (data: WeightPhotoFormData) => {
    if (!pictureId) {
      Alert.alert('Error', 'Please capture a photo first');
      return;
    }

    setIsSaving(true);
    try {
      // If weight is provided, create weight entry with picture linked
      if (data.weight_lbs && data.weight_lbs.length > 0) {
        await createWeightEntry.mutateAsync({
          weight_lbs: parseFloat(data.weight_lbs),
          recorded_at: data.recorded_at.toISOString(),
          picture_id: pictureId,
        });
      }
      // Picture is already saved, navigate back
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    // Picture is already saved as unreviewed, just go back
    router.back();
  };

  const handleDateChange = (event: unknown, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setValue('recorded_at', selectedDate);
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (hasPermission === null) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner size="large" />
        <Text marginTop="$4">Checking permissions...</Text>
      </YStack>
    );
  }

  if (hasPermission === false) {
    return (
      <YStack flex={1} padding="$4" alignItems="center" justifyContent="center">
        <Text fontSize="$6" fontWeight="600" textAlign="center">
          Camera Permission Required
        </Text>
        <Text color="$gray11" textAlign="center" marginTop="$2">
          Please enable camera access in your device settings to take photos of your scale.
        </Text>
        <Button marginTop="$4" onPress={checkPermissions}>
          Check Again
        </Button>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {!photoUri ? (
        // Camera/Pick screen
        <YStack flex={1} padding="$4" justifyContent="center" gap="$4">
          <YStack alignItems="center" gap="$2" marginBottom="$8">
            <Camera size={64} color="$gray10" />
            <Text fontSize="$7" fontWeight="700" textAlign="center">
              Capture Scale Photo
            </Text>
            <Text color="$gray11" textAlign="center">
              Take a photo of your scale display for weight tracking
            </Text>
          </YStack>

          <Button
            size="$6"
            theme="blue"
            onPress={handleTakePhoto}
            disabled={isCapturing}
            icon={isCapturing ? <Spinner size="small" /> : <Camera size={24} />}
          >
            {isCapturing ? 'Capturing...' : 'Take Photo'}
          </Button>

          <Button
            size="$5"
            variant="outlined"
            onPress={handlePickPhoto}
            disabled={isCapturing}
            icon={<ImageIcon size={20} />}
          >
            Choose from Library
          </Button>

          <Button
            size="$4"
            chromeless
            onPress={() => router.back()}
            marginTop="$4"
          >
            Cancel
          </Button>
        </YStack>
      ) : (
        // Photo preview and entry screen
        <YStack flex={1}>
          {/* Photo Preview */}
          <YStack flex={1} backgroundColor="$gray2">
            <Image
              source={{ uri: photoUri }}
              flex={1}
              resizeMode="contain"
            />
          </YStack>

          {/* Controls */}
          <YStack padding="$4" gap="$3" backgroundColor="$background">
            {/* Timestamp */}
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize="$3" color="$gray11">
                Timestamp:
              </Text>
              <Button
                size="$3"
                variant="outlined"
                onPress={() => setShowDatePicker(true)}
              >
                {formatDateTime(recordedAt)}
              </Button>
            </XStack>

            {showDatePicker && (
              <DateTimePicker
                value={recordedAt}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}

            {/* Weight Input (optional) */}
            <Controller
              control={control}
              name="weight_lbs"
              render={({ field: { onChange, value } }) => (
                <WeightInput
                  value={value || ''}
                  onChange={onChange}
                  error={errors.weight_lbs?.message}
                  label="Weight (optional - enter now or review later)"
                  placeholder="175.5"
                />
              )}
            />

            {/* Action Buttons */}
            <XStack gap="$3" marginTop="$2">
              <Button
                flex={1}
                size="$4"
                variant="outlined"
                onPress={handleRetake}
                icon={<RefreshCw size={18} />}
              >
                Retake
              </Button>
              <Button
                flex={1}
                size="$4"
                variant="outlined"
                onPress={handleSkip}
                icon={<X size={18} />}
              >
                Review Later
              </Button>
            </XStack>

            <Button
              size="$5"
              theme="blue"
              onPress={handleSubmit(onSubmit)}
              disabled={isSaving}
              icon={isSaving ? <Spinner size="small" /> : <Check size={20} />}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </YStack>
        </YStack>
      )}
    </YStack>
  );
}
