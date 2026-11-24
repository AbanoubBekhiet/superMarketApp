import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

interface ScreenHeaderProps {
  title: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
}

export function ScreenHeader({ title, leftSlot, rightSlot }: ScreenHeaderProps) {
  return (
    <View className="bg-surface border-b border-outline-subtle px-page-x py-md flex-row items-center justify-between gap-md">
      <View className="flex-row items-center gap-sm flex-1 min-w-0">
        {rightSlot}
        <Text className="font-headline text-headline-md text-on-surface" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {leftSlot ? <View className="flex-row items-center gap-sm">{leftSlot}</View> : null}
    </View>
  );
}
