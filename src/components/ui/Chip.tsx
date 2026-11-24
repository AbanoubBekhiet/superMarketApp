import { Pressable, Text } from 'react-native';

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function FilterChip({ label, active, onPress }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`px-base py-xs rounded-full min-h-[36px] items-center justify-center ${
        active
          ? 'bg-mint-surface border-2 border-primary'
          : 'bg-surface-card border border-outline-subtle'
      }`}
    >
      <Text
        className={`font-label text-label-md ${
          active ? 'text-on-mint-surface' : 'text-on-surface-muted'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
