import React, { useState, useEffect, useCallback } from 'react';
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
  Input,
  Separator,
  Sheet,
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
  Search,
} from '@tamagui/lucide-icons';
import { useQuery } from '@tanstack/react-query';
import { WeightInput } from '../../../components/weight';
import { usePictures } from '../../../hooks/usePictures';
import { useWeight } from '../../../hooks/useWeight';
import { useFood } from '../../../hooks/useFood';
import { FoodSearchInput, FoodSearchResult } from '../../../components/food';
import {
  searchFoods,
  type FoodSearchResult as FoodSearchResultType,
} from '../../../services/food-search';

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

// Validation schema for food review
const foodReviewSchema = z.object({
  name: z.string().min(1, 'Food name is required'),
  calories: z.number().min(0, 'Calories must be non-negative'),
  protein_g: z.number().min(0, 'Protein must be non-negative'),
  carbs_g: z.number().min(0, 'Carbs must be non-negative'),
  fat_g: z.number().min(0, 'Fat must be non-negative'),
  fiber_g: z.number().min(0).optional(),
  serving_size: z.number().positive('Serving size must be positive'),
  serving_unit: z.string().min(1, 'Serving unit is required'),
  servings: z.number().positive('Servings must be positive'),
  consumed_at: z.date(),
});

type FoodReviewFormData = z.infer<typeof foodReviewSchema>;

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

  // Food picture review
  if (pictureType === 'food') {
    return <FoodReviewContent picture={picture} id={id!} router={router} skipReview={skipReview} />;
  }

  // Default fallback for other picture types
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

// Separate component for food review to keep the main component cleaner
function FoodReviewContent({
  picture,
  id,
  router,
  skipReview,
}: {
  picture: NonNullable<ReturnType<typeof usePictures>['usePicture'] extends (id: string) => { data: infer T } ? T : never>;
  id: string;
  router: ReturnType<typeof useRouter>;
  skipReview: ReturnType<typeof usePictures>['skipReview'];
}) {
  const { createFoodEntry } = useFood();
  const { markAsReviewed } = usePictures();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSearchSheet, setShowSearchSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  // Search query for food lookup
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['foodSearch', searchQuery],
    queryFn: () => searchFoods(searchQuery),
    enabled: searchQuery.trim().length >= 2,
    staleTime: 1000 * 60 * 5,
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FoodReviewFormData>({
    resolver: zodResolver(foodReviewSchema),
    defaultValues: {
      name: '',
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      serving_size: 100,
      serving_unit: 'g',
      servings: 1,
      consumed_at: picture.exif_timestamp
        ? new Date(picture.exif_timestamp)
        : new Date(),
    },
  });

  const consumedAt = watch('consumed_at');

  const handleFoodSelect = useCallback(
    (food: FoodSearchResultType) => {
      setValue('name', food.description);
      setValue('calories', food.nutrients.calories);
      setValue('protein_g', food.nutrients.protein);
      setValue('carbs_g', food.nutrients.carbs);
      setValue('fat_g', food.nutrients.fat);
      setValue('fiber_g', food.nutrients.fiber);
      setValue('serving_size', food.servingSize || 100);
      setValue('serving_unit', food.servingSizeUnit || 'g');
      setShowSearchSheet(false);
      setSearchQuery('');
    },
    [setValue]
  );

  const onSubmit = async (data: FoodReviewFormData) => {
    setIsSaving(true);
    try {
      // Create food entry linked to this picture
      await createFoodEntry.mutateAsync({
        name: data.name,
        calories: data.calories,
        protein_g: data.protein_g,
        carbs_g: data.carbs_g,
        fat_g: data.fat_g,
        fiber_g: data.fiber_g,
        serving_size: data.serving_size,
        serving_unit: data.serving_unit,
        servings: data.servings,
        consumed_at: data.consumed_at.toISOString(),
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
      setValue('consumed_at', selectedDate);
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
            Review Food Photo
          </Text>
          <Text fontSize="$3" color="$gray11">
            Enter food details or search database
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
          {/* Search Button */}
          <Button
            size="$4"
            variant="outlined"
            icon={<Search size={18} />}
            onPress={() => setShowSearchSheet(true)}
          >
            Search Food Database
          </Button>

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

          <Separator />

          {/* Food Name */}
          <YStack gap="$2">
            <Label fontSize="$4" fontWeight="600">
              Food Name *
            </Label>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  placeholder="Enter food name"
                  autoCapitalize="words"
                />
              )}
            />
            {errors.name && (
              <Text color="$red10" fontSize="$2">
                {errors.name.message}
              </Text>
            )}
          </YStack>

          <Separator />

          {/* Quick Macro Inputs */}
          <Text fontSize="$5" fontWeight="600">
            Quick Macros
          </Text>

          {/* Calories */}
          <YStack gap="$2">
            <Label fontSize="$4" fontWeight="600">
              Calories
            </Label>
            <Controller
              control={control}
              name="calories"
              render={({ field: { onChange, value } }) => (
                <Input
                  value={String(value)}
                  onChangeText={(text) => onChange(parseFloat(text) || 0)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              )}
            />
          </YStack>

          {/* Macros Row */}
          <XStack gap="$3">
            <YStack flex={1} gap="$2">
              <Label fontSize="$3">Protein (g)</Label>
              <Controller
                control={control}
                name="protein_g"
                render={({ field: { onChange, value } }) => (
                  <Input
                    value={String(value)}
                    onChangeText={(text) => onChange(parseFloat(text) || 0)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                )}
              />
            </YStack>

            <YStack flex={1} gap="$2">
              <Label fontSize="$3">Carbs (g)</Label>
              <Controller
                control={control}
                name="carbs_g"
                render={({ field: { onChange, value } }) => (
                  <Input
                    value={String(value)}
                    onChangeText={(text) => onChange(parseFloat(text) || 0)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                )}
              />
            </YStack>

            <YStack flex={1} gap="$2">
              <Label fontSize="$3">Fat (g)</Label>
              <Controller
                control={control}
                name="fat_g"
                render={({ field: { onChange, value } }) => (
                  <Input
                    value={String(value)}
                    onChangeText={(text) => onChange(parseFloat(text) || 0)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                )}
              />
            </YStack>
          </XStack>

          <Separator />

          {/* Serving Info */}
          <XStack gap="$3">
            <YStack flex={1} gap="$2">
              <Label fontSize="$3">Serving Size</Label>
              <Controller
                control={control}
                name="serving_size"
                render={({ field: { onChange, value } }) => (
                  <Input
                    value={String(value)}
                    onChangeText={(text) => onChange(parseFloat(text) || 100)}
                    keyboardType="decimal-pad"
                    placeholder="100"
                  />
                )}
              />
            </YStack>

            <YStack flex={1} gap="$2">
              <Label fontSize="$3">Unit</Label>
              <Controller
                control={control}
                name="serving_unit"
                render={({ field: { onChange, value } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder="g"
                  />
                )}
              />
            </YStack>

            <YStack flex={1} gap="$2">
              <Label fontSize="$3">Servings</Label>
              <Controller
                control={control}
                name="servings"
                render={({ field: { onChange, value } }) => (
                  <Input
                    value={String(value)}
                    onChangeText={(text) => onChange(parseFloat(text) || 1)}
                    keyboardType="decimal-pad"
                    placeholder="1"
                  />
                )}
              />
            </YStack>
          </XStack>

          <Separator />

          {/* Timestamp (editable) */}
          <YStack gap="$2">
            <Label fontSize="$4" fontWeight="600">
              Consumed At
            </Label>
            <Button
              size="$4"
              variant="outlined"
              onPress={() => setShowDatePicker(true)}
              icon={<Calendar size={18} />}
              justifyContent="flex-start"
            >
              {formatDateTime(consumedAt)}
            </Button>
            <Text fontSize="$2" color="$gray10">
              You can adjust if the photo time is incorrect
            </Text>
          </YStack>

          {showDatePicker && (
            <DateTimePicker
              value={consumedAt}
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
              {isSaving ? 'Saving...' : 'Save Food Entry'}
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

      {/* Food Search Sheet */}
      <Sheet
        modal
        open={showSearchSheet}
        onOpenChange={setShowSearchSheet}
        snapPoints={[85]}
        dismissOnSnapToBottom
      >
        <Sheet.Overlay />
        <Sheet.Frame padding="$4">
          <Sheet.Handle />

          <YStack flex={1} marginTop="$4">
            <XStack
              justifyContent="space-between"
              alignItems="center"
              marginBottom="$3"
            >
              <Text fontSize="$5" fontWeight="600">
                Search Foods
              </Text>
              <Button
                size="$3"
                circular
                chromeless
                icon={<X size={20} />}
                onPress={() => setShowSearchSheet(false)}
              />
            </XStack>

            <FoodSearchInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSearch={setSearchQuery}
              isLoading={searchLoading}
              placeholder="Search for food..."
            />

            <YStack flex={1} marginTop="$3">
              {searchQuery.trim().length < 2 ? (
                <Text color="$gray10" textAlign="center" marginTop="$4">
                  Enter at least 2 characters to search
                </Text>
              ) : searchLoading ? (
                <YStack alignItems="center" marginTop="$4">
                  <Spinner />
                </YStack>
              ) : searchResults && searchResults.length > 0 ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {searchResults.map((food) => (
                    <FoodSearchResult
                      key={food.fdcId}
                      food={food}
                      onPress={handleFoodSelect}
                    />
                  ))}
                </ScrollView>
              ) : (
                <Text color="$gray10" textAlign="center" marginTop="$4">
                  No results found
                </Text>
              )}
            </YStack>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </YStack>
  );
}
