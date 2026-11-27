import type { Tabs } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { Text, View } from 'react-native';
import { formatNumber } from '@/lib/format';
import { colors, fontFamilies } from '@/theme/tokens';

type TabScreenOptions = ComponentProps<typeof Tabs>['screenOptions'];

/**
 * Shared tab-bar screen options used by both customer and admin tab navigators.
 */
export function getSharedTabScreenOptions(bottomInset: number): TabScreenOptions {
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.primaryDeep,
    tabBarInactiveTintColor: colors.onSurfaceSubtle,
    tabBarStyle: {
      backgroundColor: colors.surfaceCard,
      borderTopColor: colors.outlineSubtle,
      borderTopWidth: 1,
      height: 70 + bottomInset,
      paddingBottom: Math.max(bottomInset, 8),
      paddingTop: 6,
      shadowColor: '#1F241F',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 8,
    },
    tabBarItemStyle: {
      paddingVertical: 2,
    },
  };
}

export function TabBarIconBadge({
  focused,
  children,
  badgeCount,
}: {
  focused: boolean;
  children: ReactNode;
  badgeCount?: number;
}) {
  return (
    <View className="items-center justify-center">
      <View
        className={`relative px-3.5 py-1 rounded-full items-center justify-center ${
          focused ? 'bg-mint-surface border border-primary/50' : ''
        }`}
      >
        {children}
        {badgeCount && badgeCount > 0 ? (
          <View className="absolute -top-1 -start-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary items-center justify-center">
            <Text
              className="font-label-bold text-[10px] text-on-primary"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {formatNumber(badgeCount)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function TabBarLabelText({
  focused,
  label,
}: {
  focused: boolean;
  label: string;
}) {
  return (
    <Text
      numberOfLines={1}
      style={{
        fontFamily: focused ? fontFamilies.headlineBold : fontFamilies.bodyMedium,
        fontSize: 11,
        color: focused ? colors.primaryDeep : colors.onSurfaceSubtle,
      }}
    >
      {label}
    </Text>
  );
}
