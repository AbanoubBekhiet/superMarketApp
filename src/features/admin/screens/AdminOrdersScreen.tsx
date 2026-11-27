import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FilterChip } from '@/components/ui/Chip';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { STRINGS } from '@/constants/strings';
import { CustomerContactActions } from '@/features/admin/components/CustomerContactActions';
import { useOrders, useUpdateOrderStatus } from '@/features/orders/hooks/useOrders';
import { useAppSettings } from '@/features/profile/hooks/useProfile';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format';
import { useResolvedGeoAddress } from '@/lib/geocoding';
import { getLocalImage } from '@/lib/images';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';
import type { Order, OrderStatus } from '@/types/domain';

const STATUS_BADGE_VARIANT: Record<OrderStatus, BadgeVariant> = {
  pending: 'warning',
  processing: 'mint',
  on_the_way: 'mint',
  delivered: 'mint',
  cancelled: 'error',
};

const ALL_STATUSES: OrderStatus[] = [
  'pending',
  'processing',
  'on_the_way',
  'delivered',
  'cancelled',
];

function ExpandedOrderDetails({
  order,
  currentFreeThreshold,
  isUpdating,
  onStatusChange,
}: {
  order: Order;
  currentFreeThreshold: number;
  isUpdating: boolean;
  onStatusChange: (orderId: string, nextStatus: OrderStatus) => void;
}) {
  const { address: resolvedOrderAddress, coordsText: orderCoordsText } = useResolvedGeoAddress({
    latitude: order.customerLatitude,
    longitude: order.customerLongitude,
    fallback: order.customerAddress || order.customerArea,
  });

  const threshold = order.freeDeliveryThreshold ?? currentFreeThreshold;

  return (
    <View className="gap-md pt-md border-t border-outline-subtle">
      <View className="gap-xs">
        <Text className="font-body text-body-sm text-on-surface-muted text-right">
          {resolvedOrderAddress}
        </Text>
        {orderCoordsText ? (
          <Text
            className="font-body text-body-sm text-primary text-right"
            style={{ writingDirection: 'ltr', fontVariant: ['tabular-nums'] }}
          >
            {orderCoordsText}
          </Text>
        ) : null}
        <CustomerContactActions
          phone={order.customerPhone}
          latitude={order.customerLatitude}
          longitude={order.customerLongitude}
          addressText={resolvedOrderAddress}
        />
      </View>

      <View className="gap-sm">
        {order.items.map((it, idx) => (
          <View
            key={`${it.productId}-${idx}`}
            className="p-md rounded-lg border border-outline-subtle bg-surface flex-row items-center justify-between gap-sm"
          >
            <View className="flex-row items-center gap-sm flex-1 min-w-0">
              <Image
                source={getLocalImage(it.imageKey)}
                contentFit="cover"
                style={{ width: 44, height: 44, borderRadius: 10 }}
                accessibilityLabel={it.name}
              />
              <View className="flex-1 min-w-0">
                <Text
                  className="font-title text-title-sm text-on-surface text-right"
                  numberOfLines={1}
                >
                  {it.name}
                </Text>
                <Text
                  className="font-body text-body-sm text-on-surface-subtle text-right"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {formatNumber(it.quantity)} × {formatCurrency(it.unitPrice)}
                </Text>
              </View>
            </View>
            <Text
              className="font-headline text-title-sm text-primary"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {formatCurrency(it.unitPrice * it.quantity)}
            </Text>
          </View>
        ))}
      </View>

      <View className="gap-xs bg-surface p-md rounded-md border border-outline-subtle">
        <View className="flex-row items-center justify-between">
          <Text className="font-body text-body-sm text-on-surface-muted">
            {STRINGS.cart.subtotal}
          </Text>
          <Text
            className="font-label text-label-md text-on-surface"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {formatCurrency(order.subtotal)}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="font-body text-body-sm text-on-surface-muted">
            {STRINGS.cart.deliveryFee}
          </Text>
          <Text
            className="font-label text-label-md text-on-surface"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {order.deliveryFee === 0 ? 'مجاني' : formatCurrency(order.deliveryFee)}
          </Text>
        </View>
        {threshold > 0 ? (
          <Text className="font-body text-body-sm text-primary text-right">
            {order.deliveryFee === 0
              ? `توصيل مجاني لأن قيمة الطلب (${formatCurrency(order.subtotal)}) وصلت لحد ${formatCurrency(threshold)}`
              : `تم احتساب رسوم التوصيل لأن قيمة الطلب (${formatCurrency(order.subtotal)}) أقل من ${formatCurrency(threshold)}`}
          </Text>
        ) : null}
        {order.discount > 0 ? (
          <View className="flex-row items-center justify-between">
            <Text className="font-body text-body-sm text-primary">
              {`خصم كوبون${order.promoCode ? ` (${order.promoCode})` : ''}`}
            </Text>
            <Text
              className="font-label text-label-md text-primary"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              - {formatCurrency(order.discount)}
            </Text>
          </View>
        ) : null}
        <View className="flex-row items-center justify-between pt-xs border-t border-outline-subtle">
          <Text className="font-headline text-title-sm text-on-surface">
            {STRINGS.cart.total}
          </Text>
          <Text
            className="font-headline text-title-md text-primary"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {formatCurrency(order.total)}
          </Text>
        </View>
      </View>

      <View className="gap-sm">
        <Text className="font-title text-title-sm text-on-surface text-right">
          {STRINGS.admin.updateStatusTitle}
        </Text>
        <View className="flex-row flex-wrap gap-sm">
          {ALL_STATUSES.map((st) => (
            <FilterChip
              key={st}
              label={STRINGS.orders.statusLabels[st]}
              active={order.status === st}
              onPress={() => {
                if (!isUpdating) onStatusChange(order.id, st);
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export function AdminOrdersScreen() {
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const showToast = useUiStore((s) => s.showToast);

  const { data: allOrders = [] } = useOrders({ status: 'all' });
  const {
    data: orders = [],
    isLoading,
    isError,
    refetch,
  } = useOrders({ status: statusFilter });
  const { data: settings = [] } = useAppSettings();
  const { mutateAsync: updateStatus, isPending: isUpdating } = useUpdateOrderStatus();

  const currentFreeThreshold =
    Number(settings.find((s) => s.key === 'free_delivery_threshold')?.value ?? '450') || 0;

  const activeCount = allOrders.filter(
    (o) => o.status === 'pending' || o.status === 'processing' || o.status === 'on_the_way',
  ).length;
  const pendingCount = allOrders.filter((o) => o.status === 'pending').length;
  const processingCount = allOrders.filter((o) => o.status === 'processing').length;

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    await updateStatus({ orderId, status: nextStatus });
    showToast(STRINGS.admin.statusUpdated);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <ScreenHeader
        title={STRINGS.admin.ordersTitle}
        leftSlot={
          <Badge
            variant="mint"
            label={`${formatNumber(activeCount)} ${STRINGS.admin.activeOrdersBadgeSuffix}`}
          />
        }
      />

      {/* Status Filter Chips */}
      <View className="py-base">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-page-x gap-sm"
        >
          <FilterChip
            label={`${STRINGS.common.all} (${formatNumber(allOrders.length)})`}
            active={statusFilter === 'all'}
            onPress={() => setStatusFilter('all')}
          />
          <FilterChip
            label={`${STRINGS.orders.statusLabels.pending} (${formatNumber(pendingCount)})`}
            active={statusFilter === 'pending'}
            onPress={() => setStatusFilter('pending')}
          />
          <FilterChip
            label={`${STRINGS.orders.statusLabels.processing} (${formatNumber(processingCount)})`}
            active={statusFilter === 'processing'}
            onPress={() => setStatusFilter('processing')}
          />
          <FilterChip
            label={STRINGS.orders.statusLabels.delivered}
            active={statusFilter === 'delivered'}
            onPress={() => setStatusFilter('delivered')}
          />
        </ScrollView>
      </View>

      {isLoading ? (
        <ListSkeleton count={3} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : orders.length === 0 ? (
        <EmptyState />
      ) : (
        <FlashList
          data={orders}
          extraData={{ expandedOrderId, isUpdating }}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          renderItem={({ item: order }) => {
            const isExpanded = expandedOrderId === order.id;
            return (
              <Card className="gap-sm mb-md">
                <View className="flex-row items-center justify-between gap-sm">
                  <Text
                    className="font-title text-title-md text-on-surface"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {order.code}
                  </Text>
                  <Badge
                    variant={STATUS_BADGE_VARIANT[order.status]}
                    label={STRINGS.orders.statusLabels[order.status]}
                  />
                </View>

                <View className="flex-row items-center justify-between gap-sm">
                  <Text className="font-body text-body-md text-on-surface">
                    {order.customerName} • {order.customerArea}
                  </Text>
                  <Text
                    className="font-headline text-title-md text-primary"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {formatCurrency(order.total)}
                  </Text>
                </View>

                <View className="pt-sm border-t border-outline-subtle flex-row items-center justify-between gap-sm">
                  <Text className="font-body text-body-sm text-on-surface-subtle">
                    {order.paymentStatus === 'paid'
                      ? STRINGS.cart.paymentCard
                      : STRINGS.cart.paymentCod}{' '}
                    • {formatDateTime(order.createdAt)}
                  </Text>
                  <Button
                    variant={isExpanded ? 'mint' : 'outline'}
                    size="sm"
                    onPress={() =>
                      setExpandedOrderId((prev) => (prev === order.id ? null : order.id))
                    }
                  >
                    <Text className="font-label-bold text-label-md text-primary">
                      {isExpanded ? 'إخفاء التفاصيل' : STRINGS.admin.viewDetails}
                    </Text>
                    {isExpanded ? (
                      <ChevronUp size={15} color={colors.primary} />
                    ) : (
                      <ChevronDown size={15} color={colors.primary} />
                    )}
                  </Button>
                </View>

                {isExpanded ? (
                  <ExpandedOrderDetails
                    order={order}
                    currentFreeThreshold={currentFreeThreshold}
                    isUpdating={isUpdating}
                    onStatusChange={handleStatusChange}
                  />
                ) : null}
              </Card>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
