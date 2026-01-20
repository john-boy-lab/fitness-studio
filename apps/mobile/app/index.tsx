import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/auth.store';

export default function Index() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return null; // Or a loading screen
  }

  if (user) {
    return <Redirect href="/(auth)" />;
  }

  return <Redirect href="/(public)/login" />;
}
