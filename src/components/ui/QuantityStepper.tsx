import { Minus, Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { STRINGS } from '@/constants/strings';
import { formatNumber } from '@/lib/format';
import { colors } from '@/theme/tokens';

interface QuantityStepperProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  compact?: boolean;
}

export function QuantityStepper({
  value,
  onIncrement,
  onDecrement,
  compact = false,
}: QuantityStepperProps) {
  const btnSize = compact ? 'w-7 h-7' : 'w-8 h-8';
  const iconSize = compact ? 15 : 17;

  return (
    <View className="flex-row items-center gap-xs bg-surface border border-outline rounded-full px-xs py-xs">
      <Pressable
        onPress={onIncrement}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={STRINGS.productDetails.increaseQty}
        className={`${btnSize} rounded-full bg-mint-surface items-center justify-center active:bg-soft-accent`}
      >
        <Plus size={iconSize} color={colors.primary} />
      </Pressable>

      <Text
        className="font-headline text-title-sm text-on-surface min-w-[24px] text-center"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {formatNumber(value)}
      </Text>

      <Pressable
        onPress={onDecrement}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={STRINGS.productDetails.decreaseQty}
        className={`${btnSize} rounded-full bg-surface-card border border-outline-subtle items-center justify-center active:bg-mint-surface`}
      >
        <Minus size={iconSize} color={colors.onSurface} />
      </Pressable>
    </View>
  );
}
