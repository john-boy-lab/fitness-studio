/**
 * Food Entry Form Screen
 * Add or edit food entries with macro information
 */

import { useState, useEffect } from 'react';
import { Alert, ScrollView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  Input,
  Button,
  Label,
  TextArea,
  Separator,
  Select,
  Adapt,
  Sheet,
} from 'tamagui';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ChevronDown, ChevronUp } from '@tamagui/lucide-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useFood } from '../../../hooks/useFood';
import { createFoodEntrySchema } from '@fitness-studio/shared/validation';
import { MEAL_TYPES } from '@fitness-studio/shared/types';

interface FormData {
  name: string;
  description?: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  serving_size: number;
  serving_unit: string;
  servings: number;
  consumed_at: string;
  meal_type?: string;
  notes?: string;
  external_food_id?: string;
  external_source?: string;
}

export default function FoodAddScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    name?: string;
    calories?: string;
    protein_g?: string;
    carbs_g?: string;
    fat_g?: string;
    fiber_g?: string;
    serving_size?: string;
    serving_unit?: string;
    servings?: string;
    external_food_id?: string;
    external_source?: string;
    brand_name?: string;
    picture_id?: string;
    consumed_at?: string;
  }>();

  const { createFoodEntry } = useFood();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [consumedAt, setConsumedAt] = useState(
    params.consumed_at ? new Date(params.consumed_at) : new Date()
  );

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createFoodEntrySchema),
    defaultValues: {
      name: params.name || '',
      calories: params.calories ? parseFloat(params.calories) : 0,
      protein_g: params.protein_g ? parseFloat(params.protein_g) : 0,
      carbs_g: params.carbs_g ? parseFloat(params.carbs_g) : 0,
      fat_g: params.fat_g ? parseFloat(params.fat_g) : 0,
      fiber_g: params.fiber_g ? parseFloat(params.fiber_g) : undefined,
      serving_size: params.serving_size ? parseFloat(params.serving_size) : 100,
      serving_unit: params.serving_unit || 'g',
      servings: params.servings ? parseFloat(params.servings) : 1,
      consumed_at: consumedAt.toISOString(),
      external_food_id: params.external_food_id,
      external_source: params.external_source,
    },
  });

  // Update consumed_at when date changes
  useEffect(() => {
    setValue('consumed_at', consumedAt.toISOString());
  }, [consumedAt, setValue]);

  const onSubmit = async (data: FormData) => {
    try {
      await createFoodEntry.mutateAsync({
        ...data,
        picture_id: params.picture_id,
      });

      Alert.alert('Success', 'Food entry added successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to add food entry. Please try again.');
      console.error('Food entry error:', error);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setConsumedAt(selectedDate);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView style={{ flex: 1 }}>
        <YStack padding="$4" gap="$4">
          {/* Food Name */}
          <YStack gap="$2">
            <Label htmlFor="name">Food Name *</Label>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <Input
                  id="name"
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

          {/* Brand (if from search) */}
          {params.brand_name && (
            <YStack gap="$2">
              <Label>Brand</Label>
              <Text color="$gray11">{params.brand_name}</Text>
            </YStack>
          )}

          {/* Description */}
          <YStack gap="$2">
            <Label htmlFor="description">Description (optional)</Label>
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, value } }) => (
                <TextArea
                  id="description"
                  value={value || ''}
                  onChangeText={onChange}
                  placeholder="Add a description"
                  numberOfLines={2}
                />
              )}
            />
          </YStack>

          <Separator />

          {/* Macros Section */}
          <Text fontSize="$5" fontWeight="600">
            Nutrition Information
          </Text>

          {/* Calories */}
          <YStack gap="$2">
            <Label htmlFor="calories">Calories *</Label>
            <Controller
              control={control}
              name="calories"
              render={({ field: { onChange, value } }) => (
                <Input
                  id="calories"
                  value={String(value)}
                  onChangeText={(text) => onChange(parseFloat(text) || 0)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              )}
            />
            {errors.calories && (
              <Text color="$red10" fontSize="$2">
                {errors.calories.message}
              </Text>
            )}
          </YStack>

          {/* Macros Grid */}
          <XStack gap="$3">
            {/* Protein */}
            <YStack flex={1} gap="$2">
              <Label htmlFor="protein">Protein (g) *</Label>
              <Controller
                control={control}
                name="protein_g"
                render={({ field: { onChange, value } }) => (
                  <Input
                    id="protein"
                    value={String(value)}
                    onChangeText={(text) => onChange(parseFloat(text) || 0)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                )}
              />
            </YStack>

            {/* Carbs */}
            <YStack flex={1} gap="$2">
              <Label htmlFor="carbs">Carbs (g) *</Label>
              <Controller
                control={control}
                name="carbs_g"
                render={({ field: { onChange, value } }) => (
                  <Input
                    id="carbs"
                    value={String(value)}
                    onChangeText={(text) => onChange(parseFloat(text) || 0)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                )}
              />
            </YStack>

            {/* Fat */}
            <YStack flex={1} gap="$2">
              <Label htmlFor="fat">Fat (g) *</Label>
              <Controller
                control={control}
                name="fat_g"
                render={({ field: { onChange, value } }) => (
                  <Input
                    id="fat"
                    value={String(value)}
                    onChangeText={(text) => onChange(parseFloat(text) || 0)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                )}
              />
            </YStack>
          </XStack>

          {/* Fiber */}
          <YStack gap="$2">
            <Label htmlFor="fiber">Fiber (g)</Label>
            <Controller
              control={control}
              name="fiber_g"
              render={({ field: { onChange, value } }) => (
                <Input
                  id="fiber"
                  value={value ? String(value) : ''}
                  onChangeText={(text) =>
                    onChange(text ? parseFloat(text) : undefined)
                  }
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              )}
            />
          </YStack>

          <Separator />

          {/* Serving Section */}
          <Text fontSize="$5" fontWeight="600">
            Serving Information
          </Text>

          <XStack gap="$3">
            {/* Serving Size */}
            <YStack flex={1} gap="$2">
              <Label htmlFor="serving_size">Serving Size *</Label>
              <Controller
                control={control}
                name="serving_size"
                render={({ field: { onChange, value } }) => (
                  <Input
                    id="serving_size"
                    value={String(value)}
                    onChangeText={(text) => onChange(parseFloat(text) || 0)}
                    keyboardType="decimal-pad"
                    placeholder="100"
                  />
                )}
              />
            </YStack>

            {/* Serving Unit */}
            <YStack flex={1} gap="$2">
              <Label htmlFor="serving_unit">Unit *</Label>
              <Controller
                control={control}
                name="serving_unit"
                render={({ field: { onChange, value } }) => (
                  <Input
                    id="serving_unit"
                    value={value}
                    onChangeText={onChange}
                    placeholder="g"
                  />
                )}
              />
            </YStack>
          </XStack>

          {/* Servings Quantity */}
          <YStack gap="$2">
            <Label htmlFor="servings">Number of Servings *</Label>
            <Controller
              control={control}
              name="servings"
              render={({ field: { onChange, value } }) => (
                <Input
                  id="servings"
                  value={String(value)}
                  onChangeText={(text) => onChange(parseFloat(text) || 1)}
                  keyboardType="decimal-pad"
                  placeholder="1"
                />
              )}
            />
          </YStack>

          <Separator />

          {/* Date/Time Section */}
          <Text fontSize="$5" fontWeight="600">
            When
          </Text>

          {/* Consumed At */}
          <YStack gap="$2">
            <Label>Consumed At</Label>
            <Button variant="outlined" onPress={() => setShowDatePicker(true)}>
              {consumedAt.toLocaleString()}
            </Button>
            {showDatePicker && (
              <DateTimePicker
                value={consumedAt}
                mode="datetime"
                display="default"
                onChange={handleDateChange}
              />
            )}
          </YStack>

          {/* Meal Type */}
          <YStack gap="$2">
            <Label>Meal Type</Label>
            <Controller
              control={control}
              name="meal_type"
              render={({ field: { onChange, value } }) => (
                <Select value={value} onValueChange={onChange}>
                  <Select.Trigger iconAfter={ChevronDown}>
                    <Select.Value placeholder="Select meal type" />
                  </Select.Trigger>

                  <Adapt when="sm" platform="touch">
                    <Sheet
                      modal
                      dismissOnSnapToBottom
                      snapPoints={[40]}
                    >
                      <Sheet.Frame>
                        <Sheet.ScrollView>
                          <Adapt.Contents />
                        </Sheet.ScrollView>
                      </Sheet.Frame>
                      <Sheet.Overlay />
                    </Sheet>
                  </Adapt>

                  <Select.Content>
                    <Select.ScrollUpButton
                      alignItems="center"
                      justifyContent="center"
                      position="relative"
                      width="100%"
                      height="$3"
                    >
                      <ChevronUp size={20} />
                    </Select.ScrollUpButton>

                    <Select.Viewport>
                      <Select.Group>
                        {MEAL_TYPES.map((meal, index) => (
                          <Select.Item
                            key={meal.value}
                            index={index}
                            value={meal.value}
                          >
                            <Select.ItemText>{meal.label}</Select.ItemText>
                            <Select.ItemIndicator marginLeft="auto">
                              <Check size={16} />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Group>
                    </Select.Viewport>

                    <Select.ScrollDownButton
                      alignItems="center"
                      justifyContent="center"
                      position="relative"
                      width="100%"
                      height="$3"
                    >
                      <ChevronDown size={20} />
                    </Select.ScrollDownButton>
                  </Select.Content>
                </Select>
              )}
            />
          </YStack>

          {/* Notes */}
          <YStack gap="$2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Controller
              control={control}
              name="notes"
              render={({ field: { onChange, value } }) => (
                <TextArea
                  id="notes"
                  value={value || ''}
                  onChangeText={onChange}
                  placeholder="Add any notes about this meal"
                  numberOfLines={3}
                />
              )}
            />
          </YStack>

          <Separator />

          {/* Submit Button */}
          <Button
            size="$5"
            theme="active"
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Food Entry'}
          </Button>

          {/* Search Button */}
          <Button
            size="$4"
            variant="outlined"
            onPress={() => router.push('/(auth)/food/search')}
          >
            Search Food Database
          </Button>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
