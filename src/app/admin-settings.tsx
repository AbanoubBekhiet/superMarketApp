import { Redirect } from 'expo-router';
import { AdminSettingsScreen } from '@/features/admin/screens/AdminSettingsScreen';
import { useAuthStore } from '@/store/authStore';

export default function AdminSettingsRootRoute() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role !== 'admin' && user.role !== 'sub_admin') return <Redirect href="/(user)/(tabs)" />;
  return <AdminSettingsScreen />;
}
