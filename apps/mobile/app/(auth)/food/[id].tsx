/**
 * Food Entry Detail/Edit Screen
 * View and edit a single food entry
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
  Spinner,
} from 'tamagui';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ChevronDown, ChevronUp, Trash2 } from '@tamagui/lucide-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useFood } from '../../../hooks/useFood';
import { updateFoodEntrySchema } from '@fitness-studio/shared/validation';
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
}

export default function FoodEntryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { useFoodEntry, updateFoodEntry, deleteFoodEntry } = useFood();
  const { data: entry, isLoading } = useFoodEntry(id);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [consumedAt, setConsumedAt] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(updateFoodEntrySchema.omit({ id: true })),
  });

  // Initialize form when entry loads
  useEffect(() => {
    if (entry) {
      setConsumedAt(new Date(entry.consumed_at));
      reset({
        name: entry.name,
        description: entry.description || undefined,
        calories: entry.calories,
        protein_g: entry.protein_g,
        carbs_g: entry.carbs_g,
        fat_g: entry.fat_g,
        fiber_g: entry.fiber_g || undefined,
        serving_size: entry.serving_size,
        serving_unit: entry.serving_unit,
        servings: entry.servings,
        consumed_at: entry.consumed_at,
        meal_type: entry.meal_type || undefined,
        notes: entry.notes || undefined,
      });
    }
  }, [entry, reset]);

  // Update consumed_at when date changes
  useEffect(() => {
    setValue('consumed_at', consumedAt.toISOString());
  }, [consumedAt, setValue]);

  const onSubmit = async (data: FormData) => {
    if (!id) return;

    try {
      await updateFoodEntry.mutateAsync({
        id,
        ...data,
      });

      setIsEditing(false);
      Alert.alert('Success', 'Food entry updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update food entry. Please try again.');
      console.error('Update food entry error:', error);
    }
  };

  const handleDelete = () => {
    if (!id) return;

    Alert.alert(
      'Delete Food Entry',
      'Are you sure you want to delete this food entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFoodEntry.mutateAsync(id);
              router.back();
            } catch (error) {
              Alert.alert(
                'Error',
                'Failed to delete food entry. Please try again.'
              );
              console.error('Delete food entry error:', error);
            }
          },
        },
      ]
    );
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setConsumedAt(selectedDate);
    }
  };

  const handleCancel = () => {
    if (entry) {
      reset({
        name: entry.name,
        description: entry.description || undefined,
        calories: entry.calories,
        protein_g: entry.protein_g,
        carbs_g: entry.carbs_g,
        fat_g: entry.fat_g,
        fiber_g: entry.fiber_g || undefined,
        serving_size: entry.serving_size,
        serving_unit: entry.serving_unit,
        servings: entry.servings,
        consumed_at: entry.consumed_at,
        meal_type: entry.meal_type || undefined,
        notes: entry.notes || undefined,
      });
      setConsumedAt(new Date(entry.consumed_at));
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" />
        </YStack>
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
          <Text color="$red10">Food entry not found</Text>
          <Button marginTop="$4" onPress={() => router.back()}>
            Go Back
          </Button>
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView style={{ flex: 1 }}>
        <YStack padding="$4" gap="$4">
          {/* Header with Edit/Delete buttons */}
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$6" fontWeight="600">
              {isEditing ? 'Edit Food Entry' : 'Food Entry'}
            </Text>
            <XStack gap="$2">
              {!isEditing && (
                <>
                  <Button
                    size="$3"
                    variant="outlined"
                    onPress={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="$3"
                    variant="outlined"
                    theme="red"
                    icon={<Trash2 size={16} />}
                    onPress={handleDelete}
                  />
                </>
              )}
            </XStack>
          </XStack>

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
                  disabled={!isEditing}
                />
              )}
            />
            {errors.name && (
              <Text color="$red10" fontSize="$2">
                {errors.name.message}
              </Text>
            )}
          </YStack>

          {/* External Source */}
          {entry.external_source && (
            <YStack gap="$2">
              <Label>Source</Label>
              <Text color="$gray11" textTransform="uppercase">
                {entry.external_source}
              </Text>
            </YStack>
          )}

          {/* Description */}
          <YStack gap="$2">
            <Label htmlFor="description">Description</Label>
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
                  disabled={!isEditing}
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
                  disabled={!isEditing}
                />
              )}
            />
          </YStack>

          {/* Macros Grid */}
          <XStack gap="$3">
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
                    disabled={!isEditing}
                  />
                )}
              />
            </YStack>

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
                    disabled={!isEditing}
                  />
                )}
              />
            </YStack>

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
                    disabled={!isEditing}
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
                  disabled={!isEditing}
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
                    disabled={!isEditing}
                  />
                )}
              />
            </YStack>

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
                    disabled={!isEditing}
                  />
                )}
              />
            </YStack>
          </XStack>

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
                  disabled={!isEditing}
                />
              )}
            />
          </YStack>

          <Separator />

          {/* Date/Time Section */}
          <Text fontSize="$5" fontWeight="600">
            When
          </Text>

          <YStack gap="$2">
            <Label>Consumed At</Label>
            <Button
              variant="outlined"
              onPress={() => isEditing && setShowDatePicker(true)}
              disabled={!isEditing}
            >
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
                <Select
                  value={value}
                  onValueChange={onChange}
                  disabled={!isEditing}
                >
                  <Select.Trigger iconAfter={ChevronDown}>
                    <Select.Value placeholder="Select meal type" />
                  </Select.Trigger>

                  <Adapt when="sm" platform="touch">
                    <Sheet modal dismissOnSnapToBottom snapPoints={[40]}>
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
            <Label htmlFor="notes">Notes</Label>
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
                  disabled={!isEditing}
                />
              )}
            />
          </YStack>

          {/* Sync Status */}
          {entry.sync_status === 'pending' && (
            <Text fontSize="$2" color="$gray10" textAlign="center">
              Pending sync to server
            </Text>
          )}

          <Separator />

          {/* Action Buttons */}
          {isEditing ? (
            <XStack gap="$3">
              <Button flex={1} variant="outlined" onPress={handleCancel}>
                Cancel
              </Button>
              <Button
                flex={1}
                theme="active"
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting || !isDirty}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </XStack>
          ) : (
            <Button variant="outlined" onPress={() => router.back()}>
              Back to Food Log
            </Button>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
