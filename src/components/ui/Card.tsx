import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: ReactNode;
  padded?: boolean;
  className?: string;
}

export function Card({ children, padded = true, className = '', style, ...props }: CardProps) {
  return (
    <View
      className={`bg-surface-card border border-outline-subtle rounded-lg ${
        padded ? 'p-base' : ''
      } ${className}`}
      style={[
        {
          shadowColor: '#1F241F',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
