import { FlashList } from '@shopify/flash-list';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FilterChip } from '@/components/ui/Chip';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { STRINGS } from '@/constants/strings';
import { useOrders, useUpdateOrderStatus } from '@/features/orders/hooks/useOrders';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format';
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

export function AdminOrdersScreen() {
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const showToast = useUiStore((s) => s.showToast);

  const {
    data: orders = [],
    isLoading,
    isError,
    refetch,
  } = useOrders({ status: statusFilter });
  const { mutateAsync: updateStatus, isPending: isUpdating } = useUpdateOrderStatus();

  const activeCount = orders.filter(
    (o) => o.status === 'pending' || o.status === 'processing' || o.status === 'on_the_way',
  ).length;

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    const updated = await updateStatus({ orderId, status: nextStatus });
    setSelectedOrder(updated);
    showToast(STRINGS.admin.statusUpdated);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <ScreenHeader
        title={STRINGS.admin.ordersTitle}
        leftSlot={
          <Badge
            variant="mint"
            label={`${formatNumber(Math.max(38, activeCount))} ${STRINGS.admin.activeOrdersBadgeSuffix}`}
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
            label={STRINGS.common.all}
            active={statusFilter === 'all'}
            onPress={() => setStatusFilter('all')}
          />
          <FilterChip
            label={STRINGS.orders.statusLabels.pending}
            active={statusFilter === 'pending'}
            onPress={() => setStatusFilter('pending')}
          />
          <FilterChip
            label={STRINGS.orders.statusLabels.processing}
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
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          renderItem={({ item: order }) => (
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
                  variant="outline"
                  size="sm"
                  label={STRINGS.admin.viewDetails}
                  textClassName="text-primary text-label-md"
                  onPress={() => setSelectedOrder(order)}
                />
              </View>
            </Card>
          )}
        />
      )}

      {/* Order Details Modal */}
      <Modal
        visible={selectedOrder !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedOrder(null)}
      >
        <Pressable
          className="flex-1 bg-on-surface/40 justify-end"
          onPress={() => setSelectedOrder(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-surface-card rounded-t-xl p-lg gap-md border-t border-outline-subtle max-h-[82%]"
          >
            {selectedOrder ? (
              <>
                <View className="flex-row items-center justify-between pb-sm border-b border-outline-subtle">
                  <Text className="font-headline text-title-lg text-on-surface">
                    {STRINGS.admin.orderDetailsTitle} {selectedOrder.code}
                  </Text>
                  <Pressable onPress={() => setSelectedOrder(null)}>
                    <X size={20} color={colors.onSurfaceMuted} />
                  </Pressable>
                </View>

                <ScrollView contentContainerClassName="gap-md">
                  <View className="gap-xs">
                    <Text className="font-title text-title-sm text-on-surface text-right">
                      {selectedOrder.customerName}
                    </Text>
                    <Text className="font-body text-body-sm text-on-surface-muted text-right">
                      {selectedOrder.customerAddress}
                    </Text>
                  </View>

                  <View className="gap-xs border-t border-outline-subtle pt-sm">
                    {selectedOrder.items.map((it, idx) => (
                      <View
                        key={`${it.productId}-${idx}`}
                        className="flex-row items-center justify-between"
                      >
                        <Text className="font-body text-body-md text-on-surface">
                          {it.name} × {formatNumber(it.quantity)}
                        </Text>
                        <Text
                          className="font-headline text-title-sm text-primary"
                          style={{ fontVariant: ['tabular-nums'] }}
                        >
                          {formatCurrency(it.unitPrice * it.quantity)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View className="gap-sm border-t border-outline-subtle pt-sm">
                    <Text className="font-title text-title-sm text-on-surface text-right">
                      {STRINGS.admin.updateStatusTitle}
                    </Text>
                    <View className="flex-row flex-wrap gap-sm">
                      {ALL_STATUSES.map((st) => (
                        <FilterChip
                          key={st}
                          label={STRINGS.orders.statusLabels[st]}
                          active={selectedOrder.status === st}
                          onPress={() => {
                            if (!isUpdating) handleStatusChange(selectedOrder.id, st);
                          }}
                        />
                      ))}
                    </View>
                  </View>
                </ScrollView>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
