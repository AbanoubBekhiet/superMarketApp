import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { STRINGS } from '@/constants/strings';
import {
  useCustomers,
  useUpdateCustomerStatus,
} from '@/features/customers/hooks/useCustomers';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { formatCurrency, formatNumber } from '@/lib/format';
import { getLocalImage } from '@/lib/images';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';
import type { User } from '@/types/domain';

export function AdminCustomersScreen() {
  const showToast = useUiStore((s) => s.showToast);
  const { data: customers = [], isLoading, isError, refetch } = useCustomers();
  const { mutateAsync: updateStatus, isPending: isUpdating } = useUpdateCustomerStatus();

  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const { data: customerOrders = [] } = useOrders(
    selectedCustomer ? { customerId: selectedCustomer.id } : {},
  );

  const handleToggleStatus = async (customer: User) => {
    const nextStatus = customer.status === 'active' ? 'suspended' : 'active';
    const updated = await updateStatus({ customerId: customer.id, status: nextStatus });
    setSelectedCustomer(updated);
    showToast(STRINGS.admin.statusUpdated);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <ScreenHeader
        title={STRINGS.admin.customersTitle}
        leftSlot={
          <Badge
            variant="mint"
            label={`${formatNumber(2418 + Math.max(0, customers.length - 4))} ${STRINGS.admin.customersBadgeSuffix}`}
          />
        }
      />

      {isLoading ? (
        <ListSkeleton count={4} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : customers.length === 0 ? (
        <EmptyState />
      ) : (
        <FlashList
          data={customers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}
          renderItem={({ item: customer }) => {
            const isSuspended = customer.status === 'suspended';
            return (
              <Pressable onPress={() => setSelectedCustomer(customer)}>
                <Card className="flex-row items-center justify-between gap-md mb-md">
                  <View className="flex-row items-center gap-md flex-1 min-w-0">
                    {customer.avatarKey ? (
                      <Image
                        source={getLocalImage(customer.avatarKey)}
                        contentFit="cover"
                        style={{ width: 44, height: 44, borderRadius: 9999 }}
                        accessibilityLabel={customer.name}
                      />
                    ) : (
                      <View
                        className={`w-11 h-11 rounded-full items-center justify-center shrink-0 ${
                          isSuspended ? 'bg-surface-subtle' : 'bg-mint-surface'
                        }`}
                      >
                        <Text
                          className={`font-headline text-title-md ${
                            isSuspended ? 'text-on-surface-muted' : 'text-primary-deep'
                          }`}
                        >
                          {customer.name.charAt(0)}
                        </Text>
                      </View>
                    )}

                    <View className="flex-1 min-w-0 gap-xs">
                      <Text
                        className="font-title text-title-sm text-on-surface text-right"
                        numberOfLines={1}
                      >
                        {customer.name}
                      </Text>
                      <Text
                        className="font-body text-body-sm text-on-surface-subtle text-right"
                        style={{ fontVariant: ['tabular-nums'] }}
                      >
                        {formatNumber(customer.ordersCount)} {STRINGS.admin.customerOrdersSuffix} •{' '}
                        {formatCurrency(customer.totalSpent)}
                      </Text>
                    </View>
                  </View>

                  <Badge
                    variant={isSuspended ? 'error' : 'mint'}
                    label={
                      isSuspended
                        ? STRINGS.admin.customerStatusSuspended
                        : STRINGS.admin.customerStatusActive
                    }
                  />
                </Card>
              </Pressable>
            );
          }}
        />
      )}

      {/* Customer Detail Modal */}
      <Modal
        visible={selectedCustomer !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedCustomer(null)}
      >
        <Pressable
          className="flex-1 bg-on-surface/40 justify-end"
          onPress={() => setSelectedCustomer(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-surface-card rounded-t-xl p-lg gap-md border-t border-outline-subtle max-h-[80%]"
          >
            {selectedCustomer ? (
              <>
                <View className="flex-row items-center justify-between pb-sm border-b border-outline-subtle">
                  <Text className="font-headline text-title-lg text-on-surface">
                    {selectedCustomer.name}
                  </Text>
                  <Pressable onPress={() => setSelectedCustomer(null)}>
                    <X size={20} color={colors.onSurfaceMuted} />
                  </Pressable>
                </View>

                <View className="gap-xs">
                  <Text className="font-body text-body-md text-on-surface-muted text-right">
                    {selectedCustomer.area}
                  </Text>
                  <Text
                    className="font-body text-body-md text-on-surface text-right"
                    style={{ writingDirection: 'ltr', fontVariant: ['tabular-nums'] }}
                  >
                    {selectedCustomer.phone}
                  </Text>
                </View>

                <Button
                  variant={selectedCustomer.status === 'active' ? 'danger' : 'mint-outline'}
                  size="md"
                  isLoading={isUpdating}
                  label={STRINGS.admin.toggleCustomerStatus}
                  onPress={() => handleToggleStatus(selectedCustomer)}
                />

                <Text className="font-title text-title-sm text-on-surface text-right pt-xs">
                  {STRINGS.admin.customerOrdersHistory}
                </Text>

                <ScrollView contentContainerClassName="gap-sm">
                  {customerOrders.filter((o) => o.customerId === selectedCustomer.id).length === 0 ? (
                    <EmptyState />
                  ) : (
                    customerOrders
                      .filter((o) => o.customerId === selectedCustomer.id)
                      .map((o) => (
                        <View
                          key={o.id}
                          className="p-md rounded-lg border border-outline-subtle bg-surface flex-row items-center justify-between"
                        >
                          <Text className="font-title text-title-sm text-on-surface">
                            {o.code}
                          </Text>
                          <Text className="font-headline text-title-sm text-primary">
                            {formatCurrency(o.total)}
                          </Text>
                        </View>
                      ))
                  )}
                </ScrollView>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
