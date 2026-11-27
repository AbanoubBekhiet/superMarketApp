import { Redirect } from 'expo-router';
import { AdminActiveCartsScreen } from '@/features/admin/screens/AdminActiveCartsScreen';
import { useAuthStore } from '@/store/authStore';

export default function AdminCartsRootRoute() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role !== 'admin' && user.role !== 'sub_admin') return <Redirect href="/(user)/(tabs)" />;
  return <AdminActiveCartsScreen />;
}
