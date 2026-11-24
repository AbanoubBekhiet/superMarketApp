import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function IndexGate() {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.role === 'admin') {
    return <Redirect href="/(admin)" />;
  }

  return <Redirect href="/(user)" />;
}
