import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ArrowRight, ShoppingCart, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { STRINGS } from '@/constants/strings';
import { CustomerContactActions } from '@/features/admin/components/CustomerContactActions';
import { useActiveCarts } from '@/features/cart/hooks/useActiveCarts';
import { formatCurrency, formatNumber } from '@/lib/format';
import { useResolvedGeoAddress } from '@/lib/geocoding';
import { getLocalImage } from '@/lib/images';
import { colors } from '@/theme/tokens';
import type { ActiveCart } from '@/types/domain';

/**
 * Dedicated admin screen listing all active customer shopping carts with quick contact & map actions.
 */
export function AdminActiveCartsScreen() {
  const { data: activeCarts = [], isLoading, isError, refetch } = useActiveCarts();
  const [selectedCart, setSelectedCart] = useState<ActiveCart | null>(null);

  const { address: resolvedCartAddress, coordsText: cartCoordsText } = useResolvedGeoAddress({
    latitude: selectedCart?.customerLatitude,
    longitude: selectedCart?.customerLongitude,
    fallback: selectedCart?.customerAddress || selectedCart?.customerArea,
  });

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <ScreenHeader
        title={STRINGS.admin.activeCartsTitle}
        rightSlot={
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={STRINGS.common.back}
            className="w-9 h-9 rounded-full bg-surface-card border border-outline-subtle items-center justify-center active:bg-mint-surface"
          >
            <ArrowRight size={18} color={colors.onSurface} />
          </Pressable>
        }
        leftSlot={<Badge variant="mint" label={formatNumber(activeCarts.length)} />}
      />

      {isLoading ? (
        <ListSkeleton count={4} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : activeCarts.length === 0 ? (
        <EmptyState title={STRINGS.admin.activeCartsEmpty} />
      ) : (
        <FlashList
          data={activeCarts}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}
          renderItem={({ item: cart }) => (
            <Pressable
              onPress={() => setSelectedCart(cart)}
              className="active:opacity-90 mb-md"
            >
              <Card className="flex-row items-center justify-between gap-md">
                <View className="flex-row items-center gap-md flex-1 min-w-0">
                  <View className="w-11 h-11 rounded-md bg-mint-surface items-center justify-center shrink-0">
                    <ShoppingCart size={20} color={colors.primary} />
                  </View>
                  <View className="flex-1 min-w-0 gap-xs">
                    <Text
                      className="font-title text-title-sm text-on-surface text-right"
                      numberOfLines={1}
                    >
                      {cart.customerName}
                    </Text>
                    <Text
                      className="font-body text-body-sm text-on-surface-subtle text-right"
                      style={{ fontVariant: ['tabular-nums'] }}
                      numberOfLines={1}
                    >
                      {formatNumber(cart.itemsCount)} {STRINGS.admin.activeCartsItemsSuffix}
                      {cart.customerArea ? ` • ${cart.customerArea}` : ''}
                    </Text>
                  </View>
                </View>
                <Text
                  className="font-headline text-title-sm text-primary"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {formatCurrency(cart.subtotal)}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      )}

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
            className="bg-surface-card rounded-t-xl p-lg gap-md border-t border-outline-subtle max-h-[82%]"
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
                  <Text className="font-body text-body-sm text-on-surface-subtle text-right">
                    {resolvedCartAddress}
                  </Text>
                  {cartCoordsText ? (
                    <Text
                      className="font-body text-body-sm text-primary text-right"
                      style={{ writingDirection: 'ltr', fontVariant: ['tabular-nums'] }}
                    >
                      {cartCoordsText}
                    </Text>
                  ) : null}
                  <CustomerContactActions
                    phone={selectedCart.customerPhone}
                    latitude={selectedCart.customerLatitude}
                    longitude={selectedCart.customerLongitude}
                    addressText={resolvedCartAddress}
                  />
                </View>

                <ScrollView contentContainerClassName="gap-sm">
                  {selectedCart.items.map((it, idx) => (
                    <View
                      key={`${it.productId}-${it.weightOptionId ?? idx}`}
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
