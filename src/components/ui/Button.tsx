import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = 'primary' | 'mint' | 'mint-outline' | 'outline' | 'danger' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  label?: string;
  children?: ReactNode;
  className?: string;
  textClassName?: string;
}

const CONTAINER_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary active:bg-primary-hover',
  mint: 'bg-mint-surface border border-outline active:bg-soft-accent',
  'mint-outline': 'bg-mint-surface border-2 border-primary active:bg-soft-accent',
  outline: 'bg-surface-card border border-outline-subtle active:bg-mint-surface',
  danger: 'bg-surface-card border border-outline-subtle active:bg-error-container',
  icon: 'bg-surface-card border border-outline-subtle rounded-full items-center justify-center active:bg-mint-surface',
};

const TEXT_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'text-on-primary',
  mint: 'text-on-mint-surface',
  'mint-outline': 'text-on-mint-surface',
  outline: 'text-on-surface',
  danger: 'text-error',
  icon: 'text-on-surface',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-md py-sm rounded-md min-h-[38px]',
  md: 'px-base py-md rounded-md min-h-[44px]',
  lg: 'px-lg py-md rounded-md min-h-[48px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  label,
  children,
  className = '',
  textClassName = '',
  onPressIn,
  onPressOut,
  ...props
}: ButtonProps) {
  const isDisabled = Boolean(disabled || isLoading);
  const sizeClass = variant === 'icon' ? 'w-10 h-10 rounded-full' : SIZE_CLASSES[size];
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      style={animatedStyle}
      onPressIn={(event) => {
        if (!isDisabled) {
          scale.set(withSpring(0.97, { damping: 18, stiffness: 300 }));
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(withSpring(1, { damping: 18, stiffness: 300 }));
        onPressOut?.(event);
      }}
      className={`flex-row items-center justify-center gap-sm ${CONTAINER_VARIANTS[variant]} ${sizeClass} ${
        isDisabled ? 'opacity-50' : ''
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.onPrimary : colors.primary}
        />
      ) : null}
      {label ? (
        <Text
          className={`font-label-bold text-label-lg ${TEXT_VARIANTS[variant]} ${textClassName}`}
        >
          {label}
        </Text>
      ) : (
        <View className="flex-row items-center justify-center gap-xs">{children}</View>
      )}
    </AnimatedPressable>
  );
}
