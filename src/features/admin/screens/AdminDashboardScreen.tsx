import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  CreditCard,
  Headset,
  LogOut,
  Megaphone,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Trash2,
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
import { Input } from '@/components/ui/Input';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { STRINGS } from '@/constants/strings';
import { useAdminOverview } from '@/features/admin/hooks/useAdminOverview';
import { useActiveCarts } from '@/features/cart/hooks/useActiveCarts';
import {
  useAppSettings,
  useBanners,
  useCreateBanner,
  useDeleteBanner,
  useMarkAllNotificationsRead,
  useNotifications,
  useUpdateAppSetting,
} from '@/features/profile/hooks/useProfile';
import { formatCurrency, formatNumber } from '@/lib/format';
import { getLocalImage } from '@/lib/images';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';
import type { ActiveCart } from '@/types/domain';

export function AdminDashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const showToast = useUiStore((s) => s.showToast);

  const { data: overview, isLoading, isError, refetch } = useAdminOverview();
  const { data: activeCarts = [] } = useActiveCarts();
  const { data: notifications = [] } = useNotifications();
  const { mutate: markAllRead } = useMarkAllNotificationsRead();
  const { data: settings = [] } = useAppSettings();
  const { mutateAsync: updateSetting, isPending: savingSetting } = useUpdateAppSetting();
  const { data: banners = [] } = useBanners();
  const { mutateAsync: addBanner, isPending: savingBanner } = useCreateBanner();
  const { mutateAsync: removeBanner } = useDeleteBanner();

  const [notifOpen, setNotifOpen] = useState(false);
  const [selectedCart, setSelectedCart] = useState<ActiveCart | null>(null);
  const [supportPhoneDraft, setSupportPhoneDraft] = useState<string | null>(null);
  const [bannerTag, setBannerTag] = useState('عرض خاص');
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');

  const currentSupportPhone =
    settings.find((s) => s.key === 'support_phone')?.value ?? '+20 102 458 9120';
  const supportPhoneValue = supportPhoneDraft ?? currentSupportPhone;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleSaveSupportPhone = async () => {
    const clean = supportPhoneValue.trim();
    if (!clean) {
      showToast(STRINGS.common.requiredField, 'error');
      return;
    }
    try {
      await updateSetting({
        key: 'support_phone',
        value: clean,
        description: 'رقم خدمة العملاء',
      });
      setSupportPhoneDraft(null);
      showToast(STRINGS.admin.supportPhoneSaved);
    } catch {
      showToast(STRINGS.common.errorMessage, 'error');
    }
  };

  const handleAddBanner = async () => {
    if (!bannerTitle.trim() || !bannerSubtitle.trim()) {
      showToast(STRINGS.common.requiredField, 'error');
      return;
    }
    try {
      await addBanner({
        tag: bannerTag.trim() || 'عرض خاص',
        title: bannerTitle.trim(),
        subtitle: bannerSubtitle.trim(),
        sortOrder: banners.length + 1,
      });
      setBannerTitle('');
      setBannerSubtitle('');
      showToast(STRINGS.admin.bannerSaved);
    } catch {
      showToast(STRINGS.common.errorMessage, 'error');
    }
  };

  const handleDeleteBanner = async (id: string) => {
    try {
      await removeBanner(id);
      showToast(STRINGS.admin.bannerDeleted);
    } catch {
      showToast(STRINGS.common.errorMessage, 'error');
    }
  };

  const handleLogout = async () => {
    await signOut();
    showToast(STRINGS.auth.logoutSuccess);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      {/* Top Header */}
      <View className="bg-surface border-b border-outline-subtle px-page-x py-md flex-row items-center justify-between gap-md">
        <View className="flex-row items-center gap-sm flex-1 min-w-0">
          <View className="w-9 h-9 rounded-md overflow-hidden border border-outline-subtle shrink-0">
            <Image
              source={getLocalImage('local://logo')}
              contentFit="cover"
              style={{ width: '100%', height: '100%' }}
              accessibilityLabel={STRINGS.brand.adminTitle}
            />
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

          {/* Active Customer Carts */}
          <Card className="gap-md">
            <View className="flex-row items-center justify-between pb-sm border-b border-outline-subtle">
              <View className="flex-row items-center gap-sm">
                <ShoppingCart size={18} color={colors.primary} />
                <Text className="font-headline text-title-md text-on-surface">
                  {STRINGS.admin.activeCartsTitle}
                </Text>
              </View>
              <Badge variant="mint" label={formatNumber(activeCarts.length)} />
            </View>

            {activeCarts.length === 0 ? (
              <Text className="font-body text-body-sm text-on-surface-subtle text-center py-sm">
                {STRINGS.admin.activeCartsEmpty}
              </Text>
            ) : (
              <View className="gap-xs">
                {activeCarts.map((cart, idx) => (
                  <Pressable
                    key={cart.userId}
                    onPress={() => setSelectedCart(cart)}
                    className={`py-sm flex-row items-center justify-between gap-sm active:bg-surface ${
                      idx < activeCarts.length - 1 ? 'border-b border-outline-subtle' : ''
                    }`}
                  >
                    <View className="flex-1 min-w-0 gap-xs">
                      <Text className="font-title text-title-sm text-on-surface text-right" numberOfLines={1}>
                        {cart.customerName}
                      </Text>
                      <Text
                        className="font-body text-body-sm text-on-surface-subtle text-right"
                        style={{ fontVariant: ['tabular-nums'] }}
                      >
                        {formatNumber(cart.itemsCount)} {STRINGS.admin.activeCartsItemsSuffix}
                        {cart.customerArea ? ` • ${cart.customerArea}` : ''}
                      </Text>
                    </View>
                    <Text
                      className="font-headline text-title-sm text-primary"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {formatCurrency(cart.subtotal)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Card>

          {/* Store Support Phone Setting */}
          <Card className="gap-md">
            <View className="flex-row items-center gap-sm pb-sm border-b border-outline-subtle">
              <Headset size={18} color={colors.primary} />
              <Text className="font-headline text-title-md text-on-surface">
                {STRINGS.admin.storeSettingsTitle}
              </Text>
            </View>
            <Input
              label={STRINGS.admin.supportPhoneLabel}
              placeholder={STRINGS.admin.supportPhonePlaceholder}
              value={supportPhoneValue}
              onChangeText={setSupportPhoneDraft}
              keyboardType="phone-pad"
            />
            <Button
              variant="primary"
              size="md"
              isLoading={savingSetting}
              label={STRINGS.common.save}
              onPress={handleSaveSupportPhone}
            />
          </Card>

          {/* Banners Management */}
          <Card className="gap-md">
            <View className="flex-row items-center gap-sm pb-sm border-b border-outline-subtle">
              <Megaphone size={18} color={colors.primary} />
              <Text className="font-headline text-title-md text-on-surface">
                {STRINGS.admin.bannersTitle}
              </Text>
            </View>

            <Input
              placeholder={STRINGS.admin.bannerTagPlaceholder}
              value={bannerTag}
              onChangeText={setBannerTag}
            />
            <Input
              placeholder={STRINGS.admin.bannerTitlePlaceholder}
              value={bannerTitle}
              onChangeText={setBannerTitle}
            />
            <Input
              placeholder={STRINGS.admin.bannerSubtitlePlaceholder}
              value={bannerSubtitle}
              onChangeText={setBannerSubtitle}
            />
            <Button
              variant="mint"
              size="md"
              isLoading={savingBanner}
              onPress={handleAddBanner}
            >
              <Plus size={16} color={colors.primary} />
              <Text className="font-label-bold text-label-md text-on-mint-surface">
                {STRINGS.admin.addBannerBtn}
              </Text>
            </Button>

            {banners.length > 0 ? (
              <View className="gap-xs pt-xs border-t border-outline-subtle">
                {banners.map((b) => (
                  <View
                    key={b.id}
                    className="py-sm flex-row items-center justify-between gap-sm border-b border-outline-subtle"
                  >
                    <View className="flex-1 min-w-0 gap-xs">
                      <Text className="font-title text-title-sm text-on-surface text-right" numberOfLines={1}>
                        {b.title}
                      </Text>
                      <Text className="font-body text-body-sm text-on-surface-subtle text-right" numberOfLines={1}>
                        {b.subtitle}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleDeleteBanner(b.id)}
                      hitSlop={8}
                      accessibilityLabel={STRINGS.common.delete}
                      className="w-8 h-8 rounded-full bg-surface items-center justify-center"
                    >
                      <Trash2 size={16} color={colors.error} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
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

      {/* Active Cart Details Modal */}
      <Modal
        visible={selectedCart !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedCart(null)}
      >
        <Pressable
          className="flex-1 bg-on-surface/40 justify-end"
          onPress={() => setSelectedCart(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-surface-card rounded-t-xl p-lg gap-md border-t border-outline-subtle max-h-[75%]"
          >
            {selectedCart ? (
              <>
                <View className="flex-row items-center justify-between pb-sm border-b border-outline-subtle">
                  <Text className="font-headline text-title-lg text-on-surface">
                    {STRINGS.admin.activeCartsDetailsTitle}
                  </Text>
                  <Pressable onPress={() => setSelectedCart(null)} hitSlop={8}>
                    <X size={20} color={colors.onSurfaceMuted} />
                  </Pressable>
                </View>

                <View className="gap-xs">
                  <Text className="font-title text-title-md text-on-surface text-right">
                    {selectedCart.customerName}
                  </Text>
                  {selectedCart.customerPhone ? (
                    <Text
                      className="font-body text-body-sm text-on-surface-muted text-right"
                      style={{ writingDirection: 'ltr', fontVariant: ['tabular-nums'] }}
                    >
                      {selectedCart.customerPhone}
                    </Text>
                  ) : null}
                  {selectedCart.customerArea ? (
                    <Text className="font-body text-body-sm text-on-surface-subtle text-right">
                      {selectedCart.customerArea}
                    </Text>
                  ) : null}
                </View>

                <ScrollView contentContainerClassName="gap-sm">
                  {selectedCart.items.map((it, idx) => (
                    <View
                      key={`${it.productId}-${it.weightOptionId ?? idx}`}
                      className="p-md rounded-lg border border-outline-subtle bg-surface flex-row items-center justify-between gap-sm"
                    >
                      <View className="flex-1 min-w-0">
                        <Text className="font-title text-title-sm text-on-surface text-right" numberOfLines={1}>
                          {it.name}
                        </Text>
                        <Text
                          className="font-body text-body-sm text-on-surface-subtle text-right"
                          style={{ fontVariant: ['tabular-nums'] }}
                        >
                          {formatNumber(it.quantity)} × {formatCurrency(it.unitPrice)}
                        </Text>
                      </View>
                      <Text
                        className="font-headline text-title-sm text-primary"
                        style={{ fontVariant: ['tabular-nums'] }}
                      >
                        {formatCurrency(it.unitPrice * it.quantity)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>

                <View className="flex-row items-center justify-between pt-sm border-t border-outline-subtle">
                  <Text className="font-title text-title-md text-on-surface">
                    {STRINGS.cart.subtotal}
                  </Text>
                  <Text
                    className="font-headline text-headline-md text-primary"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {formatCurrency(selectedCart.subtotal)}
                  </Text>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
