import { forwardRef, type ComponentRef, type ReactNode } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '@/theme/tokens';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  startIcon?: ReactNode;
  endAction?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<ComponentRef<typeof TextInput>, InputProps>(function Input(
  { label, error, startIcon, endAction, containerClassName = '', className = '', ...props },
  ref,
) {
  return (
    <View className={`gap-xs ${containerClassName}`}>
      {label ? (
        <Text className="font-label text-label-md text-on-surface text-right">{label}</Text>
      ) : null}
      <View
        className={`flex-row items-center bg-surface-card border rounded-md px-md min-h-[46px] ${
          error ? 'border-error' : 'border-outline-subtle'
        }`}
      >
        {startIcon ? <View className="me-sm">{startIcon}</View> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.onSurfaceSubtle}
          textAlign="right"
          className={`flex-1 font-body text-body-md text-on-surface py-sm ${className}`}
          {...props}
        />
        {endAction ? <View className="ms-xs">{endAction}</View> : null}
      </View>
      {error ? (
        <Text className="font-body text-body-sm text-error text-right">{error}</Text>
      ) : null}
    </View>
  );
});
