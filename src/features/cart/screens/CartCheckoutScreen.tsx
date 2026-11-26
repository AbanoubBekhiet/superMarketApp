import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Home, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { EmptyState } from '@/components/ui/StateViews';
import { STRINGS } from '@/constants/strings';
import { useCreateOrder } from '@/features/orders/hooks/useOrders';
import { validateCoupon } from '@/features/profile/api/profileApi';
import { AddressPickerModal } from '@/features/profile/components/AddressPickerModal';
import {
  useAddresses,
  useAppSettings,
  useSetDefaultAddress,
} from '@/features/profile/hooks/useProfile';
import { formatCurrency, formatNumber } from '@/lib/format';
import { getLocalImage } from '@/lib/images';
import { useCartStore } from '@/store/cartStore';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';

export function CartCheckoutScreen() {
  const items = useCartStore((s) => s.items);
  const discountAmount = useCartStore((s) => s.discountAmount);
  const promoCode = useCartStore((s) => s.promoCode);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const setPromoDiscount = useCartStore((s) => s.setPromoDiscount);
  const showToast = useUiStore((s) => s.showToast);

  const { data: addresses = [] } = useAddresses();
  const { data: settings = [] } = useAppSettings();
  const { mutate: setDefaultAddress } = useSetDefaultAddress();
  const { mutateAsync: createOrder, isPending } = useCreateOrder();

  const [promoInput, setPromoInput] = useState(promoCode ?? '');
  const [addressModalOpen, setAddressModalOpen] = useState(false);

  const activeAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const baseDeliveryFee = Number(settings.find((s) => s.key === 'delivery_fee')?.value ?? '20');
  const freeThreshold = Number(
    settings.find((s) => s.key === 'free_delivery_threshold')?.value ?? '0',
  );
  const deliveryFee =
    items.length > 0
      ? freeThreshold > 0 && subtotal >= freeThreshold
        ? 0
        : baseDeliveryFee
      : 0;
  const effectiveDiscount = items.length > 0 ? Math.min(discountAmount, subtotal) : 0;
  const total = Math.max(0, subtotal + deliveryFee - effectiveDiscount);
  const itemsCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const handleApplyPromo = async () => {
    const code = promoInput.trim();
    if (!code) {
      setPromoDiscount(null, 0);
      return;
    }
    try {
      const coupon = await validateCoupon(code);
      if (!coupon || subtotal < coupon.minOrder) {
        showToast(STRINGS.cart.promoInvalid, 'error');
        return;
      }
      const rawDiscount =
        coupon.type === 'percentage' ? (subtotal * coupon.value) / 100 : coupon.value;
      const capped = coupon.maxDiscount ? Math.min(rawDiscount, coupon.maxDiscount) : rawDiscount;
      setPromoDiscount(coupon.code, Number(Math.min(capped, subtotal).toFixed(2)));
      showToast(STRINGS.cart.promoApplied, 'success');
    } catch {
      showToast(STRINGS.cart.promoInvalid, 'error');
    }
  };

  const handleConfirmOrder = async () => {
    if (items.length === 0) return;
    if (!activeAddress) {
      setAddressModalOpen(true);
      showToast(STRINGS.home.chooseAddressTitle, 'error');
      return;
    }
    try {
      await createOrder({
        addressId: activeAddress.id,
        customerArea: activeAddress.area,
        addressSnapshot: `${activeAddress.label} - ${activeAddress.street}، ${activeAddress.area}، ${activeAddress.city}`,
        items: items.map((i) => ({
          productId: i.productId,
          weightOptionId: i.weightOptionId ?? undefined,
          quantity: i.quantity,
        })),
        couponCode: promoCode ?? undefined,
        deliverySlot: 'instant',
        paymentMethod: 'cod',
      });
      clearCart();
      showToast(STRINGS.cart.orderCreatedSuccess);
      router.push('/(user)/(tabs)/orders');
    } catch (err) {
      const msg = err instanceof Error ? err.message : STRINGS.common.errorMessage;
      showToast(msg || STRINGS.common.errorMessage, 'error');
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      {/* Header */}
      <View className="bg-surface border-b border-outline-subtle px-page-x py-md flex-row items-center justify-between gap-md">
        <View className="flex-row items-center gap-sm">
          <Text className="font-headline text-headline-md text-on-surface">
            {STRINGS.cart.title}
          </Text>
          {items.length > 0 ? (
            <Badge
              variant="mint"
              label={`${formatNumber(itemsCount)} ${STRINGS.cart.itemsSuffix}`}
            />
          ) : null}
        </View>
        {items.length > 0 ? (
          <Pressable onPress={clearCart} hitSlop={8}>
            <Text className="font-label text-label-md text-error">
              {STRINGS.cart.emptyAction}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {items.length === 0 ? (
        <View className="flex-1 justify-center">
          <EmptyState
            title={STRINGS.cart.emptyCartTitle}
            subtitle={STRINGS.cart.emptyCartSubtitle}
            actionLabel={STRINGS.cart.browseProducts}
            onAction={() => router.push('/(user)/(tabs)')}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerClassName="px-page-x pt-base pb-xl gap-section"
          showsVerticalScrollIndicator={false}
        >
          {/* Cart Items */}
          <View className="gap-md">
            {items.map((item) => (
              <Card
                key={`${item.productId}-${item.weightOptionId}`}
                padded={false}
                className="p-md flex-row items-center gap-md"
              >
                <Image
                  source={getLocalImage(item.imageKey)}
                  contentFit="cover"
                  style={{ width: 64, height: 64, borderRadius: 12 }}
                  accessibilityLabel={item.name}
                />
                <View className="flex-1 min-w-0 gap-xs">
                  <View className="flex-row items-start justify-between gap-xs">
                    <Text
                      className="flex-1 font-title text-title-sm text-on-surface-card text-right"
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                    <Pressable
                      onPress={() => removeItem(item.productId, item.weightOptionId)}
                      hitSlop={8}
                      accessibilityLabel={STRINGS.common.delete}
                    >
                      <Trash2 size={18} color={colors.onSurfaceSubtle} />
                    </Pressable>
                  </View>

                  <View className="flex-row items-center justify-between gap-sm">
                    <Text
                      className="font-headline text-title-sm text-primary"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {formatCurrency(item.unitPrice)}
                    </Text>
                    <QuantityStepper
                      compact
                      value={item.quantity}
                      onIncrement={() =>
                        updateQuantity(item.productId, item.weightOptionId, 1)
                      }
                      onDecrement={() =>
                        updateQuantity(item.productId, item.weightOptionId, -1)
                      }
                    />
                  </View>
                </View>
              </Card>
            ))}
          </View>

          {/* Promo Code */}
          <View className="flex-row items-center gap-sm">
            <TextInput
              value={promoInput}
              onChangeText={setPromoInput}
              placeholder={STRINGS.cart.promoPlaceholder}
              placeholderTextColor={colors.onSurfaceSubtle}
              textAlign="right"
              className="flex-1 bg-surface-card border border-outline-subtle rounded-md px-base py-md font-body text-body-md text-on-surface min-h-[46px]"
            />
            <Button
              variant="mint"
              size="md"
              label={STRINGS.cart.promoApply}
              onPress={handleApplyPromo}
            />
          </View>

          {/* Delivery Address */}
          <Card>
            <View className="flex-row items-center justify-between gap-sm">
              <View className="flex-row items-center gap-sm flex-1 min-w-0">
                <View className="w-9 h-9 rounded-full bg-mint-surface items-center justify-center shrink-0">
                  <Home size={18} color={colors.primary} />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="font-title text-title-sm text-on-surface text-right">
                    {STRINGS.cart.deliveryAddress}
                  </Text>
                  <Text
                    className="font-body text-body-sm text-on-surface-muted text-right"
                    numberOfLines={1}
                  >
                    {activeAddress
                      ? `${activeAddress.street}، ${activeAddress.area}، ${activeAddress.city}`
                      : '14 شارع فوزي معاذ، سموحة، الإسكندرية'}
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => setAddressModalOpen(true)} hitSlop={8}>
                <Text className="font-label text-label-md text-primary">
                  {STRINGS.cart.changeAddress}
                </Text>
              </Pressable>
            </View>
          </Card>

          {/* Order Summary */}
          <Card className="gap-sm">
            <Text className="font-title text-title-md text-on-surface text-right mb-xs">
              {STRINGS.cart.summaryTitle}
            </Text>

            <View className="flex-row items-center justify-between">
              <Text className="font-body text-body-md text-on-surface-muted">
                {STRINGS.cart.subtotal}
              </Text>
              <Text
                className="font-label text-label-md text-on-surface"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatCurrency(subtotal)}
              </Text>
            </View>

            <View className="gap-xs">
              <View className="flex-row items-center justify-between">
                <Text className="font-body text-body-md text-on-surface-muted">
                  {STRINGS.cart.deliveryFee}
                </Text>
                {freeThreshold > 0 && deliveryFee === 0 ? (
                  <Badge variant="mint" label="توصيل مجاني" />
                ) : (
                  <Text
                    className="font-label text-label-md text-on-surface"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {formatCurrency(deliveryFee)}
                  </Text>
                )}
              </View>
              {freeThreshold > 0 ? (
                <Text className="font-body text-body-sm text-primary text-right">
                  {deliveryFee === 0
                    ? `التوصيل مجاني لأن قيمة طلبك تخطت ${formatCurrency(freeThreshold)}`
                    : `التوصيل المجاني متاح للطلبات من ${formatCurrency(freeThreshold)} (متبقي ${formatCurrency(Math.max(0, freeThreshold - subtotal))})`}
                </Text>
              ) : null}
            </View>

            {effectiveDiscount > 0 ? (
              <View className="flex-row items-center justify-between">
                <Text className="font-body text-body-md text-primary">
                  {STRINGS.cart.discount}
                </Text>
                <Text
                  className="font-label text-label-md text-primary"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  - {formatCurrency(effectiveDiscount)}
                </Text>
              </View>
            ) : null}

            <View className="border-t border-outline-subtle pt-sm mt-xs flex-row items-center justify-between">
              <Text className="font-headline text-title-md text-on-surface">
                {STRINGS.cart.total}
              </Text>
              <Text
                className="font-headline text-headline-md text-primary"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatCurrency(total)}
              </Text>
            </View>

            <Button
              variant="primary"
              size="lg"
              isLoading={isPending}
              label={`${STRINGS.cart.confirmOrder} — ${formatCurrency(total)}`}
              onPress={handleConfirmOrder}
              className="mt-sm"
            />
          </Card>
        </ScrollView>
      )}

      <AddressPickerModal
        visible={addressModalOpen}
        addresses={addresses}
        onClose={() => setAddressModalOpen(false)}
        onSelectAddress={setDefaultAddress}
      />
    </SafeAreaView>
  );
}
