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
    </Stack>
  );
}
