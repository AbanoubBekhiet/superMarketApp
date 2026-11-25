import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { RotateCcw } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { STRINGS } from '@/constants/strings';
import { OrderProgressTracker } from '@/features/orders/components/OrderProgressTracker';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { formatCurrency, formatNumber, formatShortDate } from '@/lib/format';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';
import type { Order } from '@/types/domain';

export function OrdersScreen() {
  const user = useAuthStore((s) => s.user);
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUiStore((s) => s.showToast);

  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

  const {
    data: orders = [],
    isLoading,
    isError,
    refetch,
  } = useOrders({ customerId: user?.id });

  const activeOrders = orders.filter(
    (o) => o.status === 'pending' || o.status === 'processing' || o.status === 'on_the_way',
  );
  const pastOrders = orders.filter(
    (o) => o.status === 'delivered' || o.status === 'cancelled',
  );

  const displayedOrders = activeTab === 'active' ? activeOrders : pastOrders;

  const handleCallCourier = (order: Order) => {
    if (order.courierPhone) {
      Linking.openURL(`tel:${order.courierPhone}`).catch(() => {});
    }
    showToast(`${STRINGS.orders.callingCourierNotice} ${order.courierName ?? ''}`);
  };

  const handleReorder = (order: Order) => {
    order.items.forEach((item) => {
      addItem(
        {
          productId: item.productId,
          weightOptionId: `${item.productId}-reorder`,
          name: item.name,
          imageKey: item.imageKey,
          unitLabel: item.unitLabel,
          unitPrice: item.unitPrice,
        },
        item.quantity,
      );
    });
    showToast(STRINGS.orders.reorderedSuccess);
    router.push('/(user)/(tabs)/cart');
  };

  const renderOrderItem = ({ item: order }: { item: Order }) => {
    if (activeTab === 'active') {
      return (
        <Card className="gap-base mb-md">
          <View className="flex-row items-center justify-between gap-sm pb-sm border-b border-outline-subtle">
            <View className="gap-xs">
              <Text
                className="font-title text-title-md text-on-surface text-right"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {STRINGS.orders.orderPrefix} {order.code}
              </Text>
              <Text
                className="font-body text-body-sm text-on-surface-subtle text-right"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatShortDate(order.createdAt)} • {formatNumber(order.itemsCount)}{' '}
                {STRINGS.cart.itemsSuffix}
              </Text>
            </View>
            <Text
              className="font-headline text-title-md text-primary"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {formatCurrency(order.total)}
            </Text>
          </View>

          <OrderProgressTracker status={order.status} etaMinutes={order.etaMinutes} />

          <View className="flex-row items-center justify-between gap-sm pt-xs">
            <Text className="font-body text-body-sm text-on-surface-muted">
              {STRINGS.orders.courierLabel} {order.courierName ?? 'كريم محمود'}
            </Text>
            <Button
              variant="mint"
              size="sm"
              label={STRINGS.orders.callCourier}
              onPress={() => handleCallCourier(order)}
            />
          </View>
        </Card>
      );
    }

    const isCancelled = order.status === 'cancelled';
    return (
      <Card className="gap-md mb-md">
        <View className="flex-row items-center justify-between gap-sm">
          <View className="gap-xs">
            <Text
              className="font-title text-title-md text-on-surface text-right"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {STRINGS.orders.orderPrefix} {order.code}
            </Text>
            <Text
              className="font-body text-body-sm text-on-surface-subtle text-right"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {formatShortDate(order.createdAt)} • {formatNumber(order.itemsCount)}{' '}
              {STRINGS.cart.itemsSuffix}
            </Text>
          </View>
          <Badge
            variant={isCancelled ? 'error' : 'mint'}
            label={STRINGS.orders.statusLabels[order.status]}
          />
        </View>

        <View className="flex-row items-center justify-between gap-sm pt-sm border-t border-outline-subtle">
          <Text
            className="font-headline text-title-md text-on-surface"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {formatCurrency(order.total)}
          </Text>
          <Button variant="mint" size="sm" onPress={() => handleReorder(order)}>
            <RotateCcw size={16} color={colors.primary} />
            <Text className="font-label text-label-md text-on-mint-surface">
              {STRINGS.orders.reorder}
            </Text>
          </Button>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <ScreenHeader title={STRINGS.orders.title} />

      <View className="px-page-x pt-base pb-md">
        <View className="flex-row gap-xs p-xs bg-surface-subtle rounded-md border border-outline-subtle">
          <Pressable
            onPress={() => setActiveTab('active')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'active' }}
            className={`flex-1 py-sm px-md rounded-sm items-center ${
              activeTab === 'active'
                ? 'bg-surface-card border border-outline-subtle'
                : ''
            }`}
          >
            <Text
              className={`font-label-bold text-label-lg ${
                activeTab === 'active' ? 'text-primary' : 'text-on-surface-muted'
              }`}
            >
              {STRINGS.orders.activeTab}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('past')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'past' }}
            className={`flex-1 py-sm px-md rounded-sm items-center ${
              activeTab === 'past'
                ? 'bg-surface-card border border-outline-subtle'
                : ''
            }`}
          >
            <Text
              className={`font-label-bold text-label-lg ${
                activeTab === 'past' ? 'text-primary' : 'text-on-surface-muted'
              }`}
            >
              {STRINGS.orders.pastTab}
            </Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <ListSkeleton count={3} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : displayedOrders.length === 0 ? (
        <EmptyState
          title={
            activeTab === 'active' ? STRINGS.orders.emptyActive : STRINGS.orders.emptyPast
          }
        />
      ) : (
        <FlashList
          data={displayedOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}
