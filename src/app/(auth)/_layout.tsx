import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/theme/tokens';

export default function AuthLayout() {
  const user = useAuthStore((s) => s.user);

  if (user?.role === 'admin') {
    return <Redirect href="/(admin)" />;
  }
  if (user?.role === 'user') {
    return <Redirect href="/(user)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
      }}
    />
  );
}
