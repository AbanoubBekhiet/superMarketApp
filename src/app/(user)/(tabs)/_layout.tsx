import { Tabs } from 'expo-router';
import { Home, LayoutGrid, ReceiptText, ShoppingBag, User } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STRINGS } from '@/constants/strings';
import { formatNumber } from '@/lib/format';
import { useCartStore } from '@/store/cartStore';
import { colors, fontFamilies } from '@/theme/tokens';

export default function UserTabsLayout() {
  const insets = useSafeAreaInsets();
  const cartCount = useCartStore((s) =>
    s.items.reduce((sum, item) => sum + item.quantity, 0),
  );

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
          title: STRINGS.userTabs.home,
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: STRINGS.userTabs.categories,
          tabBarIcon: ({ color, size }) => <LayoutGrid size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: STRINGS.userTabs.cart,
          tabBarIcon: ({ color, size }) => (
            <View className="relative">
              <ShoppingBag size={size} color={color} />
              {cartCount > 0 ? (
                <View className="absolute -top-1.5 -start-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary items-center justify-center">
                  <Text
                    className="font-label-bold text-[10px] text-on-primary"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {formatNumber(cartCount)}
                  </Text>
                </View>
              ) : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: STRINGS.userTabs.orders,
          tabBarIcon: ({ color, size }) => <ReceiptText size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: STRINGS.userTabs.profile,
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
