import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/theme/tokens';

export default function UserRootLayout() {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }
  if (user.role === 'admin' || user.role === 'sub_admin') {
    return <Redirect href="/(admin)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="product/[id]" />
    </Stack>
  );
}
