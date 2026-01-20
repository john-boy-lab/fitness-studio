import { YStack, Text, H1, Button } from 'tamagui';
import { useAuthStore } from '../../store/auth.store';

export default function Login() {
  const { signInWithGoogle } = useAuthStore();

  return (
    <YStack
      flex={1}
      justifyContent="center"
      alignItems="center"
      padding="$4"
      backgroundColor="$background"
    >
      <H1 marginBottom="$4">Fitness Studio</H1>
      <Text marginBottom="$6" textAlign="center">
        Track your fitness journey with photos, weight, and nutrition logging.
      </Text>
      <Button
        size="$5"
        theme="active"
        onPress={signInWithGoogle}
      >
        Sign in with Google
      </Button>
    </YStack>
  );
}
