import { YStack, Text, H1 } from 'tamagui';
import { useAuthStore } from '../../store/auth.store';

export default function Dashboard() {
  const { user } = useAuthStore();

  return (
    <YStack flex={1} padding="$4" backgroundColor="$background">
      <H1>Welcome to Fitness Studio</H1>
      <Text marginTop="$2">
        {user?.displayName || user?.email || 'User'}
      </Text>
    </YStack>
  );
}
