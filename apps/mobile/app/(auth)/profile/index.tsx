import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  H2,
  Button,
  Label,
  Input,
  Select,
  Adapt,
  Sheet,
  Spinner,
} from 'tamagui';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  profileFormSchema,
  ProfileFormData,
  ProfileActivityLevel,
  ProfileSex,
  ACTIVITY_LEVEL_LABELS,
} from '@fitness-studio/shared/validation';
import { toLocalISOString } from '@fitness-studio/shared/utils';
import { useAuthStore } from '../../../store/auth.store';
import { supabase } from '../../../services/supabase';

const SEX_OPTIONS: { value: ProfileSex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const ACTIVITY_OPTIONS: { value: ProfileActivityLevel; label: string }[] = [
  { value: 'sedentary', label: ACTIVITY_LEVEL_LABELS.sedentary },
  { value: 'light', label: ACTIVITY_LEVEL_LABELS.light },
  { value: 'moderate', label: ACTIVITY_LEVEL_LABELS.moderate },
  { value: 'active', label: ACTIVITY_LEVEL_LABELS.active },
  { value: 'very_active', label: ACTIVITY_LEVEL_LABELS.very_active },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      height_inches: 70, // 5'10"
      birth_date: '1990-01-01',
      sex: 'male',
      activity_level: 'moderate',
    },
  });

  const birthDate = watch('birth_date');

  // Load existing profile
  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('user_fitness_profile')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows returned
          throw error;
        }

        if (data) {
          setValue('height_inches', data.height_inches);
          setValue('birth_date', data.birth_date);
          setValue('sex', data.sex as ProfileSex);
          setValue('activity_level', data.activity_level as ProfileActivityLevel);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [user?.id, setValue]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user?.id) return;

    setIsSaving(true);
    setError(null);

    try {
      // Upsert the profile
      const { error } = await supabase
        .from('user_fitness_profile')
        .upsert(
          {
            user_id: user.id,
            height_inches: data.height_inches,
            birth_date: data.birth_date,
            sex: data.sex,
            activity_level: data.activity_level,
          },
          {
            onConflict: 'user_id',
          }
        );

      if (error) throw error;

      // Navigate to goals screen
      router.push('/(auth)/goals');
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateChange = (event: unknown, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setValue('birth_date', toLocalISOString(selectedDate), { shouldDirty: true });
    }
  };

  const formatHeightDisplay = (inches: number): string => {
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
  };

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" />
        <Text marginTop="$3">Loading profile...</Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} padding="$4" backgroundColor="$background">
      <H2 marginBottom="$4">Your Profile</H2>
      <Text color="$gray10" marginBottom="$6">
        Tell us about yourself so we can calculate your nutrition targets.
      </Text>

      {error && (
        <XStack
          backgroundColor="$red2"
          padding="$3"
          borderRadius="$2"
          marginBottom="$4"
        >
          <Text color="$red10">{error}</Text>
        </XStack>
      )}

      {/* Height Input */}
      <YStack marginBottom="$4">
        <Label htmlFor="height">Height</Label>
        <Controller
          control={control}
          name="height_inches"
          render={({ field: { onChange, value } }) => (
            <XStack alignItems="center" gap="$2">
              <Input
                id="height"
                flex={1}
                keyboardType="numeric"
                value={String(value)}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  if (!isNaN(num)) {
                    onChange(num);
                  }
                }}
                placeholder="Height in inches"
              />
              <Text color="$gray10" minWidth={60}>
                {formatHeightDisplay(value)}
              </Text>
            </XStack>
          )}
        />
        {errors.height_inches && (
          <Text color="$red10" fontSize="$2" marginTop="$1">
            {errors.height_inches.message}
          </Text>
        )}
      </YStack>

      {/* Birth Date Input */}
      <YStack marginBottom="$4">
        <Label htmlFor="birth_date">Birth Date</Label>
        <Controller
          control={control}
          name="birth_date"
          render={({ field: { value } }) => (
            <>
              <Button
                onPress={() => setShowDatePicker(true)}
                variant="outlined"
                justifyContent="flex-start"
              >
                {value || 'Select birth date'}
              </Button>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(value || '1990-01-01')}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date('1900-01-01')}
                />
              )}
            </>
          )}
        />
        {errors.birth_date && (
          <Text color="$red10" fontSize="$2" marginTop="$1">
            {errors.birth_date.message}
          </Text>
        )}
      </YStack>

      {/* Sex Selector */}
      <YStack marginBottom="$4">
        <Label htmlFor="sex">Sex (for BMR calculation)</Label>
        <Controller
          control={control}
          name="sex"
          render={({ field: { onChange, value } }) => (
            <Select value={value} onValueChange={onChange}>
              <Select.Trigger>
                <Select.Value placeholder="Select sex" />
              </Select.Trigger>
              <Adapt when="sm" platform="touch">
                <Sheet modal dismissOnSnapToBottom snapPoints={[30]}>
                  <Sheet.Frame padding="$4">
                    <Sheet.ScrollView>
                      <Adapt.Contents />
                    </Sheet.ScrollView>
                  </Sheet.Frame>
                  <Sheet.Overlay />
                </Sheet>
              </Adapt>
              <Select.Content>
                <Select.Viewport>
                  {SEX_OPTIONS.map((option, index) => (
                    <Select.Item key={option.value} value={option.value} index={index}>
                      <Select.ItemText>{option.label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select>
          )}
        />
        {errors.sex && (
          <Text color="$red10" fontSize="$2" marginTop="$1">
            {errors.sex.message}
          </Text>
        )}
      </YStack>

      {/* Activity Level Selector */}
      <YStack marginBottom="$6">
        <Label htmlFor="activity_level">Activity Level</Label>
        <Controller
          control={control}
          name="activity_level"
          render={({ field: { onChange, value } }) => (
            <Select value={value} onValueChange={onChange}>
              <Select.Trigger>
                <Select.Value placeholder="Select activity level" />
              </Select.Trigger>
              <Adapt when="sm" platform="touch">
                <Sheet modal dismissOnSnapToBottom snapPoints={[50]}>
                  <Sheet.Frame padding="$4">
                    <Sheet.ScrollView>
                      <Adapt.Contents />
                    </Sheet.ScrollView>
                  </Sheet.Frame>
                  <Sheet.Overlay />
                </Sheet>
              </Adapt>
              <Select.Content>
                <Select.Viewport>
                  {ACTIVITY_OPTIONS.map((option, index) => (
                    <Select.Item key={option.value} value={option.value} index={index}>
                      <Select.ItemText>{option.label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select>
          )}
        />
        {errors.activity_level && (
          <Text color="$red10" fontSize="$2" marginTop="$1">
            {errors.activity_level.message}
          </Text>
        )}
      </YStack>

      {/* Submit Button */}
      <Button
        size="$5"
        theme="active"
        onPress={handleSubmit(onSubmit)}
        disabled={isSaving}
      >
        {isSaving ? <Spinner /> : 'Continue to Goals'}
      </Button>
    </YStack>
  );
}
