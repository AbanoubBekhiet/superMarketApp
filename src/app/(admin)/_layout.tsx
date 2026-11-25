import { Redirect, Tabs } from 'expo-router';
import { FolderTree, LayoutDashboard, Package, ReceiptText, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STRINGS } from '@/constants/strings';
import { useAuthStore } from '@/store/authStore';
import { colors, fontFamilies } from '@/theme/tokens';

export default function AdminTabsLayout() {
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }
  if (user.role !== 'admin' && user.role !== 'sub_admin') {
    return <Redirect href="/(user)/(tabs)" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceSubtle,
        tabBarStyle: {
          backgroundColor: colors.surfaceCard,
          borderTopColor: colors.outlineSubtle,
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          shadowColor: '#1F241F',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamilies.headlineSemiBold,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: STRINGS.adminTabs.overview,
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: STRINGS.adminTabs.orders,
          tabBarIcon: ({ color, size }) => <ReceiptText size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: STRINGS.adminTabs.products,
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: STRINGS.adminTabs.categories,
          tabBarIcon: ({ color, size }) => <FolderTree size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: STRINGS.adminTabs.customers,
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
