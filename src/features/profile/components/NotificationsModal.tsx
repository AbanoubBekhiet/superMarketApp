import { BellRing, X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/StateViews';
import { STRINGS } from '@/constants/strings';
import { NotificationCardItem } from '@/features/profile/components/NotificationCardItem';
import { formatNumber } from '@/lib/format';
import { colors } from '@/theme/tokens';
import type { NotificationItem } from '@/types/domain';

interface NotificationsModalProps {
  visible: boolean;
  notifications: NotificationItem[];
  onClose: () => void;
  onMarkAllRead: () => void;
}

/**
 * Bottom-sheet modal showing recent customer notifications and order updates.
 */
export function NotificationsModal({
  visible,
  notifications,
  onClose,
  onMarkAllRead,
}: NotificationsModalProps) {
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-on-surface/40 justify-end" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-surface-card rounded-t-xl p-lg gap-md border-t border-outline-subtle max-h-[80%]"
        >
          <View className="flex-row items-center justify-between pb-sm border-b border-outline-subtle">
            <View className="flex-row items-center gap-sm">
              <View className="w-8 h-8 rounded-full bg-mint-surface items-center justify-center">
                <BellRing size={16} color={colors.primaryDeep} />
              </View>
              <Text className="font-headline text-title-lg text-on-surface">
                {STRINGS.common.notifications}
              </Text>
              {unreadCount > 0 ? (
                <View className="px-sm py-0.5 rounded-full bg-primary">
                  <Text className="font-label-bold text-label-sm text-on-primary">
                    {formatNumber(unreadCount)}
                  </Text>
                </View>
              ) : null}
            </View>
            <View className="flex-row items-center gap-sm">
              <Button
                variant="mint"
                size="sm"
                label={STRINGS.common.markAllRead}
                onPress={onMarkAllRead}
              />
              <Pressable onPress={onClose} hitSlop={8}>
                <X size={20} color={colors.onSurfaceMuted} />
              </Pressable>
            </View>
          </View>
          <ScrollView contentContainerClassName="gap-sm pb-sm" showsVerticalScrollIndicator={false}>
            {notifications.length === 0 ? (
              <EmptyState title={STRINGS.common.noNotifications} />
            ) : (
              notifications.map((n) => <NotificationCardItem key={n.id} notification={n} />)
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
