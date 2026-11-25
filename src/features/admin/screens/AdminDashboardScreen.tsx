import { router } from 'expo-router';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  CreditCard,
  Leaf,
  LogOut,
  ShoppingBag,
  Truck,
  UserPlus,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { STRINGS } from '@/constants/strings';
import { useAdminOverview } from '@/features/admin/hooks/useAdminOverview';
import {
  useMarkAllNotificationsRead,
  useNotifications,
} from '@/features/profile/hooks/useProfile';
import { formatCurrency, formatNumber } from '@/lib/format';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';

export function AdminDashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const showToast = useUiStore((s) => s.showToast);

  const { data: overview, isLoading, isError, refetch } = useAdminOverview();
  const { data: notifications = [] } = useNotifications();
  const { mutate: markAllRead } = useMarkAllNotificationsRead();

  const [notifOpen, setNotifOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleLogout = async () => {
    await signOut();
    showToast(STRINGS.auth.logoutSuccess);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      {/* Top Header */}
      <View className="bg-surface border-b border-outline-subtle px-page-x py-md flex-row items-center justify-between gap-md">
        <View className="flex-row items-center gap-sm flex-1 min-w-0">
          <View className="w-9 h-9 rounded-md bg-primary items-center justify-center shrink-0">
            <Leaf size={20} color={colors.onPrimary} />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="font-headline text-title-md text-on-surface text-right">
              {STRINGS.brand.adminTitle}
            </Text>
            <Text
              className="font-body text-body-sm text-on-surface-subtle text-right"
              numberOfLines={1}
            >
              {STRINGS.admin.welcomePrefix} {user?.name ?? STRINGS.brand.adminTitle}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-sm">
          <Pressable
            onPress={() => setNotifOpen(true)}
            accessibilityLabel={STRINGS.common.notifications}
            className="relative w-10 h-10 rounded-full bg-surface-card border border-outline-subtle items-center justify-center"
          >
            <Bell size={20} color={colors.onSurface} />
            {unreadCount > 0 ? (
              <View className="absolute -top-1 -start-1">
                <Badge variant="numeric" label={formatNumber(unreadCount)} />
              </View>
            ) : null}
          </Pressable>

          <Pressable
            onPress={handleLogout}
            accessibilityLabel={STRINGS.profile.logout}
            className="w-10 h-10 rounded-full bg-surface-card border border-outline-subtle items-center justify-center"
          >
            <LogOut size={18} color={colors.error} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <ListSkeleton count={3} />
      ) : isError || !overview ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <ScrollView
          contentContainerClassName="px-page-x pt-base pb-xl gap-section"
          showsVerticalScrollIndicator={false}
        >
          {/* KPI Cards */}
          <View className="flex-row gap-md items-stretch">
            <Card className="flex-1 justify-between gap-sm">
              <View className="flex-row items-center justify-between">
                <Text className="font-title text-title-sm text-on-surface-muted flex-1 text-right">
                  {STRINGS.admin.totalRevenue}
                </Text>
                <CreditCard size={18} color={colors.primary} />
              </View>
              <Text
                className="font-headline text-headline-md text-on-surface text-right"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatCurrency(overview.totalRevenue)}
              </Text>
              <Badge
                variant="mint"
                label={`+${formatNumber(overview.revenueGrowthPercent)}%`}
              />
            </Card>

            <Card className="flex-1 justify-between gap-sm">
              <View className="flex-row items-center justify-between">
                <Text className="font-title text-title-sm text-on-surface-muted flex-1 text-right">
                  {STRINGS.admin.activeOrders}
                </Text>
                <Truck size={18} color={colors.primary} />
              </View>
              <Text
                className="font-headline text-headline-md text-on-surface text-right"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatNumber(overview.activeOrdersCount)}
              </Text>
              <Badge
                variant="warning"
                label={`${formatNumber(overview.processingOrdersCount)} ${STRINGS.admin.processingBadgeSuffix}`}
              />
            </Card>
          </View>

          {/* Recent Activity Feed */}
          <Card className="gap-md">
            <View className="flex-row items-center justify-between pb-sm border-b border-outline-subtle">
              <Text className="font-headline text-title-md text-on-surface">
                {STRINGS.admin.recentActivity}
              </Text>
              <Pressable onPress={() => router.push('/(admin)/orders')}>
                <Text className="font-label text-label-md text-primary">
                  {STRINGS.admin.viewOrders}
                </Text>
              </Pressable>
            </View>

            <View className="gap-xs">
              {overview.recentActivities.map((act, idx) => {
                const isWarning = act.tone === 'warning';
                const Icon =
                  act.icon === 'warning'
                    ? AlertTriangle
                    : act.icon === 'check'
                      ? CheckCircle2
                      : act.icon === 'user'
                        ? UserPlus
                        : ShoppingBag;

                return (
                  <View
                    key={act.id}
                    className={`py-sm flex-row items-start gap-sm ${
                      idx < overview.recentActivities.length - 1
                        ? 'border-b border-outline-subtle'
                        : ''
                    }`}
                  >
                    <View
                      className={`w-8 h-8 rounded-full items-center justify-center shrink-0 mt-xs ${
                        isWarning ? 'bg-warning-container' : 'bg-mint-surface'
                      }`}
                    >
                      <Icon
                        size={16}
                        color={isWarning ? colors.onWarningContainer : colors.primary}
                      />
                    </View>
                    <View className="flex-1 min-w-0 gap-xs">
                      <Text className="font-title text-title-sm text-on-surface text-right">
                        {act.title}
                      </Text>
                      <Text
                        className="font-body text-body-sm text-on-surface-subtle text-right"
                        style={{ fontVariant: ['tabular-nums'] }}
                      >
                        {act.subtitle} • {act.relativeTime}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        </ScrollView>
      )}

      {/* Notifications Modal */}
      <Modal
        visible={notifOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNotifOpen(false)}
      >
        <Pressable
          className="flex-1 bg-on-surface/40 justify-end"
          onPress={() => setNotifOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-surface-card rounded-t-xl p-lg gap-md border-t border-outline-subtle max-h-[75%]"
          >
            <View className="flex-row items-center justify-between pb-sm border-b border-outline-subtle">
              <Text className="font-headline text-title-lg text-on-surface">
                {STRINGS.common.notifications}
              </Text>
              <View className="flex-row items-center gap-sm">
                <Button
                  variant="mint"
                  size="sm"
                  label={STRINGS.common.markAllRead}
                  onPress={() => markAllRead()}
                />
                <Pressable onPress={() => setNotifOpen(false)}>
                  <X size={20} color={colors.onSurfaceMuted} />
                </Pressable>
              </View>
            </View>
            <ScrollView contentContainerClassName="gap-sm">
              {notifications.length === 0 ? (
                <EmptyState title={STRINGS.common.noNotifications} />
              ) : (
                notifications.map((n) => (
                  <View
                    key={n.id}
                    className={`p-md rounded-lg border border-outline-subtle gap-xs ${
                      n.isRead ? 'bg-surface-card' : 'bg-mint-surface/40'
                    }`}
                  >
                    <Text className="font-title text-title-sm text-on-surface text-right">
                      {n.title}
                    </Text>
                    <Text className="font-body text-body-sm text-on-surface-muted text-right">
                      {n.body}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
