import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

export type BadgeVariant = 'mint' | 'warning' | 'error' | 'neutral' | 'numeric';

interface BadgeProps {
  variant?: BadgeVariant;
  label?: string;
  children?: ReactNode;
  className?: string;
}

const BG_VARIANTS: Record<BadgeVariant, string> = {
  mint: 'bg-mint-surface rounded-sm px-sm py-xs',
  warning: 'bg-warning-container rounded-sm px-sm py-xs',
  error: 'bg-error-container rounded-sm px-sm py-xs',
  neutral: 'bg-surface-subtle rounded-sm px-sm py-xs',
  numeric: 'bg-primary rounded-full min-w-[20px] h-[20px] px-xs items-center justify-center',
};

const TEXT_VARIANTS: Record<BadgeVariant, string> = {
  mint: 'text-on-mint-surface',
  warning: 'text-on-warning-container',
  error: 'text-on-error-container',
  neutral: 'text-on-surface',
  numeric: 'text-on-primary',
};

export function Badge({ variant = 'mint', label, children, className = '' }: BadgeProps) {
  return (
    <View className={`self-start flex-row items-center justify-center ${BG_VARIANTS[variant]} ${className}`}>
      {label !== undefined ? (
        <Text
          className={`font-label text-label-sm ${TEXT_VARIANTS[variant]}`}
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {label}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
