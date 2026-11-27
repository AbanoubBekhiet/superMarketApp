import { Tabs } from 'expo-router';
import { Home, LayoutGrid, ReceiptText, ShoppingBag, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getSharedTabScreenOptions,
  TabBarIconBadge,
  TabBarLabelText,
} from '@/components/ui/TabBarParts';
import { STRINGS } from '@/constants/strings';
import { useCartStore } from '@/store/cartStore';

export default function UserTabsLayout() {
  const insets = useSafeAreaInsets();
  const cartCount = useCartStore((s) =>
    s.items.reduce((sum, item) => sum + item.quantity, 0),
  );

  return (
    <Tabs screenOptions={getSharedTabScreenOptions(insets.bottom)}>
      <Tabs.Screen
        name="index"
        options={{
          title: STRINGS.userTabs.home,
          tabBarLabel: ({ focused }) => (
            <TabBarLabelText focused={focused} label={STRINGS.userTabs.home} />
          ),
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIconBadge focused={focused}>
              <Home size={size} color={color} />
            </TabBarIconBadge>
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: STRINGS.userTabs.categories,
          tabBarLabel: ({ focused }) => (
            <TabBarLabelText focused={focused} label={STRINGS.userTabs.categories} />
          ),
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIconBadge focused={focused}>
              <LayoutGrid size={size} color={color} />
            </TabBarIconBadge>
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: STRINGS.userTabs.cart,
          tabBarLabel: ({ focused }) => (
            <TabBarLabelText focused={focused} label={STRINGS.userTabs.cart} />
          ),
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIconBadge focused={focused} badgeCount={cartCount}>
              <ShoppingBag size={size} color={color} />
            </TabBarIconBadge>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: STRINGS.userTabs.orders,
          tabBarLabel: ({ focused }) => (
            <TabBarLabelText focused={focused} label={STRINGS.userTabs.orders} />
          ),
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIconBadge focused={focused}>
              <ReceiptText size={size} color={color} />
            </TabBarIconBadge>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: STRINGS.userTabs.profile,
          tabBarLabel: ({ focused }) => (
            <TabBarLabelText focused={focused} label={STRINGS.userTabs.profile} />
          ),
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIconBadge focused={focused}>
              <User size={size} color={color} />
            </TabBarIconBadge>
          ),
        }}
      />
    </Tabs>
  );
}
