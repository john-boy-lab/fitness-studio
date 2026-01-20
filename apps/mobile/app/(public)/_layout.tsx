import { Redirect, Stack } from 'expo-router';
import { Spinner, YStack } from 'tamagui';
import { useAuthStore } from '../../store/auth.store';

export default function PublicLayout() {
  const { user, isLoading, isInitialized } = useAuthStore();

  // Show loading state while auth is initializing
  if (!isInitialized || isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" />
      </YStack>
    );
  }

  // Redirect to dashboard if already authenticated
  if (user) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <Stack>
      <Stack.Screen
        name="login"
        options={{
          title: 'Login',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
