import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/StateViews';
import { STRINGS } from '@/constants/strings';
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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-on-surface/40 justify-end" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-surface-card rounded-t-xl p-lg gap-md border-t border-outline-subtle max-h-[75%]"
        >
          <View className="flex-row items-center justify-between pb-sm border-b border-outline-subtle">
            <Text className="font-headline text-title-lg text-on-surface">
              {STRINGS.common.notifications}
            </Text>
            <Button
              variant="mint"
              size="sm"
              label={STRINGS.common.markAllRead}
              onPress={onMarkAllRead}
            />
          </View>
          <ScrollView contentContainerClassName="gap-sm">
            {notifications.length === 0 ? (
              <EmptyState title={STRINGS.common.noNotifications} />
            ) : (
              notifications.map((n) => (
                <View
                  key={n.id}
                  className={`p-md rounded-lg border border-outline-subtle gap-xs ${
                    n.isRead ? 'bg-surface-card' : 'bg-mint-surface/50'
                  }`}
                >
                  <Text className="font-title text-title-sm text-on-surface text-right">
                    {n.title}
                  </Text>
                  <Text className="font-body text-body-sm text-on-surface-muted text-right">
                    {n.body}
                  </Text>
                  <Text className="font-body text-body-sm text-on-surface-subtle text-right">
                    {n.relativeTime}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
