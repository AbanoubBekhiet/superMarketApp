import { Redirect, Tabs } from 'expo-router';
import { FolderTree, LayoutDashboard, Package, ReceiptText, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getSharedTabScreenOptions,
  TabBarIconBadge,
  TabBarLabelText,
} from '@/components/ui/TabBarParts';
import { STRINGS } from '@/constants/strings';
import { useAuthStore } from '@/store/authStore';

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
    <Tabs screenOptions={getSharedTabScreenOptions(insets.bottom)}>
      <Tabs.Screen
        name="index"
        options={{
          title: STRINGS.adminTabs.overview,
          tabBarLabel: ({ focused }) => (
            <TabBarLabelText focused={focused} label={STRINGS.adminTabs.overview} />
          ),
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIconBadge focused={focused}>
              <LayoutDashboard size={size} color={color} />
            </TabBarIconBadge>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: STRINGS.adminTabs.orders,
          tabBarLabel: ({ focused }) => (
            <TabBarLabelText focused={focused} label={STRINGS.adminTabs.orders} />
          ),
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIconBadge focused={focused}>
              <ReceiptText size={size} color={color} />
            </TabBarIconBadge>
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: STRINGS.adminTabs.products,
          tabBarLabel: ({ focused }) => (
            <TabBarLabelText focused={focused} label={STRINGS.adminTabs.products} />
          ),
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIconBadge focused={focused}>
              <Package size={size} color={color} />
            </TabBarIconBadge>
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: STRINGS.adminTabs.categories,
          tabBarLabel: ({ focused }) => (
            <TabBarLabelText focused={focused} label={STRINGS.adminTabs.categories} />
          ),
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIconBadge focused={focused}>
              <FolderTree size={size} color={color} />
            </TabBarIconBadge>
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: STRINGS.adminTabs.customers,
          tabBarLabel: ({ focused }) => (
            <TabBarLabelText focused={focused} label={STRINGS.adminTabs.customers} />
          ),
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIconBadge focused={focused}>
              <Users size={size} color={color} />
            </TabBarIconBadge>
          ),
        }}
      />
    </Tabs>
  );
}
