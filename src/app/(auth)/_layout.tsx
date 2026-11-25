import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/theme/tokens';

export default function AuthLayout() {
  const user = useAuthStore((s) => s.user);

  if (user?.role === 'admin' || user?.role === 'sub_admin') {
    return <Redirect href="/(admin)" />;
  }
  if (user?.role === 'customer') {
    return <Redirect href="/(user)/(tabs)" />;
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
