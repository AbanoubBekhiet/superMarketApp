import { BellRing, Package, Sparkles } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { colors } from '@/theme/tokens';
import type { NotificationItem } from '@/types/domain';

interface NotificationCardItemProps {
  notification: NotificationItem;
}

const TYPE_META: Record<
  NotificationItem['type'],
  { label: string; Icon: typeof BellRing }
> = {
  order_update: { label: 'تحديث طلب', Icon: Package },
  promotion: { label: 'عرض وخصم', Icon: Sparkles },
  admin_alert: { label: 'تنبيه إداري', Icon: BellRing },
  system: { label: 'إشعار عام', Icon: BellRing },
};

/**
 * High-contrast notification card with type icon, unread indicator, and readable body hierarchy.
 */
export function NotificationCardItem({ notification }: NotificationCardItemProps) {
  const { label, Icon } = TYPE_META[notification.type] ?? TYPE_META.system;
  const unread = !notification.isRead;

  return (
    <View
      className={`p-md rounded-xl border flex-row items-start gap-md ${
        unread
          ? 'bg-mint-surface/55 border-primary border-r-4'
          : 'bg-surface-card border-outline-subtle'
      }`}
    >
      <View
        className={`w-10 h-10 rounded-full items-center justify-center mt-0.5 ${
          unread ? 'bg-primary' : 'bg-surface-subtle'
        }`}
      >
        <Icon size={18} color={unread ? colors.onPrimary : colors.primary} />
      </View>

      <View className="flex-1 gap-xs">
        <View className="flex-row items-center justify-between gap-sm">
          <View className="flex-row items-center gap-xs">
            <View className="px-sm py-0.5 rounded-full bg-surface-subtle border border-outline-subtle">
              <Text className="font-label text-label-sm text-on-surface-muted">{label}</Text>
            </View>
            {unread ? (
              <View className="px-sm py-0.5 rounded-full bg-primary">
                <Text className="font-label-bold text-label-sm text-on-primary">جديد</Text>
              </View>
            ) : null}
          </View>

          {notification.relativeTime ? (
            <Text className="font-body text-body-sm text-on-surface-subtle">
              {notification.relativeTime}
            </Text>
          ) : null}
        </View>

        <Text className="font-headline text-title-sm text-on-surface text-right">
          {notification.title}
        </Text>

        <Text className="font-body text-body-md text-on-surface-muted text-right leading-5">
          {notification.body}
        </Text>
      </View>
    </View>
  );
}
