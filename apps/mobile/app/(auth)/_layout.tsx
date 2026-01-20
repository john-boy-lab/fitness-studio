import { Redirect, Stack } from 'expo-router';
import { Spinner, YStack } from 'tamagui';
import { useAuthStore } from '../../store/auth.store';

export default function AuthLayout() {
  const { user, isLoading, isInitialized } = useAuthStore();

  // Show loading state while auth is initializing
  if (!isInitialized || isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" />
      </YStack>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Redirect href="/(public)/login" />;
  }

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Dashboard',
        }}
      />
      <Stack.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="goals/index"
        options={{
          title: 'Goals',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="food/index"
        options={{
          title: 'Food Log',
        }}
      />
      <Stack.Screen
        name="food/add"
        options={{
          title: 'Add Food',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="food/search"
        options={{
          title: 'Search Food',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="food/[id]"
        options={{
          title: 'Food Entry',
        }}
      />
      <Stack.Screen
        name="review/index"
        options={{
          title: 'Review Queue',
        }}
      />
      <Stack.Screen
        name="review/[id]"
        options={{
          title: 'Review Photo',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="weight/index"
        options={{
          title: 'Weight History',
        }}
      />
      <Stack.Screen
        name="weight/add"
        options={{
          title: 'Log Weight',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="weight/camera"
        options={{
          title: 'Weight Photo',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="weight/[id]"
        options={{
          title: 'Weight Entry',
        }}
      />
    </Stack>
  );
}
