import { Check, Home, Package, Truck } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { STRINGS } from '@/constants/strings';
import { formatNumber } from '@/lib/format';
import { colors } from '@/theme/tokens';
import type { OrderStatus } from '@/types/domain';

interface OrderProgressTrackerProps {
  status: OrderStatus;
  etaMinutes?: number;
}

const STEP_INDEX: Record<OrderStatus, number> = {
  pending: 0,
  processing: 1,
  on_the_way: 2,
  delivered: 3,
  cancelled: -1,
};

export function OrderProgressTracker({ status, etaMinutes }: OrderProgressTrackerProps) {
  const currentStep = STEP_INDEX[status];
  const steps = [
    { key: 'confirmed', label: STRINGS.orders.steps.confirmed, Icon: Check },
    { key: 'preparing', label: STRINGS.orders.steps.preparing, Icon: Package },
    { key: 'onTheWay', label: STRINGS.orders.steps.onTheWay, Icon: Truck },
    { key: 'delivered', label: STRINGS.orders.steps.delivered, Icon: Home },
  ] as const;

  return (
    <View className="gap-sm">
      <View className="flex-row items-center justify-between">
        <Text className="font-label-bold text-label-md text-primary">
          {STRINGS.orders.statusLabels[status]}
        </Text>
        {etaMinutes ? (
          <Text
            className="font-body text-body-sm text-on-surface-muted"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {STRINGS.orders.etaPrefix} {formatNumber(etaMinutes)} {STRINGS.orders.minutesSuffix}
          </Text>
        ) : null}
      </View>

      <View className="flex-row items-start gap-xs pt-xs">
        {steps.map(({ key, label, Icon }, idx) => {
          const isDone = idx < currentStep || (status === 'delivered' && idx === 3);
          const isCurrent = idx === currentStep && status !== 'delivered';

          const circleClass = isDone
            ? 'bg-primary'
            : isCurrent
              ? 'bg-secondary border-2 border-primary'
              : 'bg-surface-subtle border border-outline-subtle';

          const barClass = isDone
            ? 'bg-primary'
            : isCurrent
              ? 'bg-secondary'
              : 'bg-outline-subtle';

          const labelClass = isDone
            ? 'text-on-surface'
            : isCurrent
              ? 'text-primary-deep'
              : 'text-on-surface-subtle';

          const iconColor = isDone
            ? colors.onPrimary
            : isCurrent
              ? colors.onSecondary
              : colors.onSurfaceSubtle;

          return (
            <View key={key} className="flex-1 items-center gap-xs">
              <View className={`w-8 h-8 rounded-full items-center justify-center ${circleClass}`}>
                <Icon size={16} color={iconColor} />
              </View>
              <View className={`w-full h-1 rounded-full ${barClass}`} />
              <Text className={`font-label text-label-sm text-center ${labelClass}`}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
