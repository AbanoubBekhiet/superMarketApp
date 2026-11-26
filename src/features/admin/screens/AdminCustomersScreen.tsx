import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import {
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  ReceiptText,
  User as UserIcon,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { STRINGS } from '@/constants/strings';
import {
  useCustomerAddresses,
  useCustomers,
  useUpdateCustomerStatus,
} from '@/features/customers/hooks/useCustomers';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { formatCurrency, formatNumber, formatShortDate } from '@/lib/format';
import { getLocalImage } from '@/lib/images';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';
import type { User } from '@/types/domain';

const PAGE_SIZE = 15;

type CustomerModalMode = null | 'details' | 'orders';

function formatWhatsappDigits(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('01') && digits.length === 11) {
    return `2${digits}`;
  }
  if (digits.startsWith('00')) {
    return digits.slice(2);
  }
  return digits;
}

export function AdminCustomersScreen() {
  const showToast = useUiStore((s) => s.showToast);
  const { data: customers = [], isLoading, isError, refetch } = useCustomers();
  const { mutateAsync: updateStatus, isPending: isUpdating } = useUpdateCustomerStatus();

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [modalMode, setModalMode] = useState<CustomerModalMode>(null);

  const { data: customerOrders = [] } = useOrders(
    selectedCustomer && modalMode === 'orders' ? { customerId: selectedCustomer.id } : {},
  );
  const { data: customerAddresses = [] } = useCustomerAddresses(
    selectedCustomer && modalMode === 'details' ? selectedCustomer.id : null,
  );

  const visibleCustomers = customers.slice(0, visibleCount);
  const hasMore = visibleCustomers.length < customers.length;

  const handleLoadMore = () => {
    if (hasMore) {
      setVisibleCount((prev) => Math.min(customers.length, prev + PAGE_SIZE));
    }
  };

  const openCustomerModal = (customer: User, mode: 'details' | 'orders') => {
    setSelectedCustomer(customer);
    setModalMode(mode);
  };

  const closeCustomerModal = () => {
    setModalMode(null);
    setSelectedCustomer(null);
  };

  const handleToggleStatus = async (customer: User) => {
    const nextStatus = customer.status === 'active' ? 'suspended' : 'active';
    const updated = await updateStatus({ customerId: customer.id, status: nextStatus });
    setSelectedCustomer(updated);
    showToast(STRINGS.admin.statusUpdated);
  };

  const defaultAddress =
    customerAddresses.find((a) => a.isDefault) ?? customerAddresses[0] ?? null;

  const resolvedLat = defaultAddress?.latitude ?? selectedCustomer?.latitude ?? null;
  const resolvedLng = defaultAddress?.longitude ?? selectedCustomer?.longitude ?? null;
  const resolvedAddressText = defaultAddress
    ? `${defaultAddress.street}، ${defaultAddress.area}، ${defaultAddress.city}`
    : selectedCustomer?.area ?? '';

  const handleOpenLocation = async () => {
    if (resolvedLat != null && resolvedLng != null) {
      await Linking.openURL(`https://www.google.com/maps?q=${resolvedLat},${resolvedLng}`).catch(
        () => undefined,
      );
      return;
    }
    if (resolvedAddressText) {
      await Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(resolvedAddressText)}`,
      ).catch(() => undefined);
    }
  };

  const handleCallCustomer = async (phone: string) => {
    const clean = phone.replace(/\s+/g, '');
    if (!clean || clean === 'غير مسجل') return;
    await Linking.openURL(`tel:${clean}`).catch(() => undefined);
  };

  const handleWhatsappCustomer = async (phone: string) => {
    const waDigits = formatWhatsappDigits(phone);
    if (!waDigits) return;
    await Linking.openURL(`https://wa.me/${waDigits}`).catch(() => undefined);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <ScreenHeader
        title={STRINGS.admin.customersTitle}
        leftSlot={
          <Badge
            variant="mint"
            label={`${formatNumber(customers.length)} ${STRINGS.admin.customersBadgeSuffix}`}
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
          data={visibleCustomers}
          keyExtractor={(item) => item.id}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}
          renderItem={({ item: customer }) => {
            const isSuspended = customer.status === 'suspended';
            return (
              <Card className="gap-sm mb-md">
                <View className="flex-row items-center justify-between gap-md">
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
                </View>

                <View className="flex-row gap-sm pt-xs border-t border-outline-subtle">
                  <Button
                    variant="mint"
                    size="sm"
                    onPress={() => openCustomerModal(customer, 'details')}
                    className="flex-1"
                  >
                    <UserIcon size={15} color={colors.primary} />
                    <Text className="font-label-bold text-label-sm text-on-mint-surface">
                      {STRINGS.admin.customerDetailsBtn}
                    </Text>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => openCustomerModal(customer, 'orders')}
                    className="flex-1"
                  >
                    <ReceiptText size={15} color={colors.primary} />
                    <Text className="font-label-bold text-label-sm text-primary">
                      {STRINGS.admin.customerOrdersHistory}
                    </Text>
                  </Button>
                </View>
              </Card>
            );
          }}
          ListFooterComponent={
            customers.length > 0 ? (
              <View className="py-md items-center gap-xs">
                {hasMore ? <ActivityIndicator size="small" color={colors.primary} /> : null}
                <Text
                  className="font-body text-body-sm text-on-surface-subtle"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  عرض {formatNumber(visibleCustomers.length)} من {formatNumber(customers.length)}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Customer Details / Orders Modal */}
      <Modal
        visible={selectedCustomer !== null && modalMode !== null}
        transparent
        animationType="fade"
        onRequestClose={closeCustomerModal}
      >
        <Pressable
          className="flex-1 bg-on-surface/40 justify-end"
          onPress={closeCustomerModal}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-surface-card rounded-t-xl p-lg gap-md border-t border-outline-subtle max-h-[85%]"
          >
            {selectedCustomer && modalMode === 'details' ? (
              <>
                <View className="flex-row items-center justify-between pb-sm border-b border-outline-subtle">
                  <Text className="font-headline text-title-lg text-on-surface">
                    {STRINGS.admin.customerDetailsBtn}
                  </Text>
                  <Pressable onPress={closeCustomerModal} hitSlop={8}>
                    <X size={20} color={colors.onSurfaceMuted} />
                  </Pressable>
                </View>

                <ScrollView contentContainerClassName="gap-md" showsVerticalScrollIndicator={false}>
                  <View className="flex-row items-center justify-between gap-sm">
                    <Text className="font-headline text-title-md text-on-surface text-right flex-1">
                      {selectedCustomer.name}
                    </Text>
                    <Badge
                      variant={selectedCustomer.status === 'suspended' ? 'error' : 'mint'}
                      label={
                        selectedCustomer.status === 'suspended'
                          ? STRINGS.admin.customerStatusSuspended
                          : STRINGS.admin.customerStatusActive
                      }
                    />
                  </View>

                  {/* Phone + Call / WhatsApp */}
                  <View className="p-md rounded-lg bg-surface border border-outline-subtle gap-sm">
                    <Text className="font-label text-label-md text-on-surface-muted text-right">
                      {STRINGS.admin.customerPhoneLabel}
                    </Text>
                    <Text
                      className="font-headline text-title-md text-on-surface text-right"
                      style={{ writingDirection: 'ltr', fontVariant: ['tabular-nums'] }}
                    >
                      {selectedCustomer.phone}
                    </Text>
                    {selectedCustomer.phone && selectedCustomer.phone !== 'غير مسجل' ? (
                      <View className="flex-row gap-sm pt-xs">
                        <Button
                          variant="primary"
                          size="sm"
                          onPress={() => handleCallCustomer(selectedCustomer.phone)}
                          className="flex-1"
                        >
                          <Phone size={15} color={colors.onPrimary} />
                          <Text className="font-label-bold text-label-md text-on-primary">
                            {STRINGS.admin.callCustomerBtn}
                          </Text>
                        </Button>
                        <Button
                          variant="mint-outline"
                          size="sm"
                          onPress={() => handleWhatsappCustomer(selectedCustomer.phone)}
                          className="flex-1"
                        >
                          <MessageCircle size={15} color={colors.primary} />
                          <Text className="font-label-bold text-label-md text-primary">
                            {STRINGS.admin.whatsappCustomerBtn}
                          </Text>
                        </Button>
                      </View>
                    ) : null}
                  </View>

                  {/* Address + Location */}
                  <View className="p-md rounded-lg bg-surface border border-outline-subtle gap-sm">
                    <Text className="font-label text-label-md text-on-surface-muted text-right">
                      {STRINGS.admin.customerAddressLabel}
                    </Text>
                    <Text className="font-body text-body-md text-on-surface text-right">
                      {resolvedAddressText || selectedCustomer.area}
                    </Text>
                    <Button
                      variant="mint"
                      size="sm"
                      onPress={handleOpenLocation}
                    >
                      <MapPin size={15} color={colors.primary} />
                      <Text className="font-label-bold text-label-md text-on-mint-surface">
                        {STRINGS.admin.openLocationBtn}
                      </Text>
                      <ExternalLink size={14} color={colors.primary} />
                    </Button>
                  </View>

                  <Button
                    variant={selectedCustomer.status === 'active' ? 'danger' : 'mint-outline'}
                    size="md"
                    isLoading={isUpdating}
                    label={STRINGS.admin.toggleCustomerStatus}
                    onPress={() => handleToggleStatus(selectedCustomer)}
                  />
                </ScrollView>
              </>
            ) : null}

            {selectedCustomer && modalMode === 'orders' ? (
              <>
                <View className="flex-row items-center justify-between pb-sm border-b border-outline-subtle">
                  <Text className="font-headline text-title-lg text-on-surface">
                    {STRINGS.admin.customerOrdersHistory} — {selectedCustomer.name}
                  </Text>
                  <Pressable onPress={closeCustomerModal} hitSlop={8}>
                    <X size={20} color={colors.onSurfaceMuted} />
                  </Pressable>
                </View>

                <ScrollView contentContainerClassName="gap-sm">
                  {customerOrders.filter((o) => o.customerId === selectedCustomer.id).length === 0 ? (
                    <EmptyState />
                  ) : (
                    customerOrders
                      .filter((o) => o.customerId === selectedCustomer.id)
                      .map((o) => (
                        <View
                          key={o.id}
                          className="p-md rounded-lg border border-outline-subtle bg-surface flex-row items-center justify-between gap-sm"
                        >
                          <View className="gap-xs">
                            <Text className="font-title text-title-sm text-on-surface text-right">
                              {o.code}
                            </Text>
                            <Text className="font-body text-body-sm text-on-surface-subtle text-right">
                              {formatShortDate(o.createdAt)} • {STRINGS.orders.statusLabels[o.status]}
                            </Text>
                          </View>
                          <Text
                            className="font-headline text-title-sm text-primary"
                            style={{ fontVariant: ['tabular-nums'] }}
                          >
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
