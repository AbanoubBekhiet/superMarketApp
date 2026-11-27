import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, CheckCircle2, Heart, Share2, ShoppingBag } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { STRINGS } from '@/constants/strings';
import { useProduct } from '@/features/products/hooks/useProducts';
import { useFavoriteIds, useToggleFavorite } from '@/features/profile/hooks/useProfile';
import { formatCurrency, formatNumber } from '@/lib/format';
import { getLocalImage } from '@/lib/images';
import { useCartStore } from '@/store/cartStore';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';

export function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: product, isLoading, isError, refetch } = useProduct(String(id ?? ''));

  const addItem = useCartStore((s) => s.addItem);
  const { data: remoteFavIds = [] } = useFavoriteIds();
  const { mutateAsync: toggleRemoteFav } = useToggleFavorite();
  const localFavIds = useCartStore((s) => s.favoriteIds);
  const toggleLocalFav = useCartStore((s) => s.toggleFavoriteLocal);
  const showToast = useUiStore((s) => s.showToast);

  const favoriteIds = remoteFavIds.length > 0 ? remoteFavIds : localFavIds;

  const [selectedWeightId, setSelectedWeightId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <ListSkeleton count={3} />
      </SafeAreaView>
    );
  }

  if (isError || !product) {
    return (
      <SafeAreaView className="flex-1 bg-surface justify-center">
        <ErrorState onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const isFav = favoriteIds.includes(product.id);
  const defaultWeight = product.weights[1] ?? product.weights[0];
  const selectedWeight =
    product.weights.find((w) => w.id === selectedWeightId) ?? defaultWeight;
  const displayPrice = selectedWeight?.price ?? product.price;
  const displayOldPrice = selectedWeight?.oldPrice ?? product.oldPrice;

  const handleToggleFav = async () => {
    const added = toggleLocalFav(product.id);
    showToast(added ? STRINGS.productDetails.favAdd : STRINGS.productDetails.favRemove);
    await toggleRemoteFav({ productId: product.id, currentlyFavorite: isFav }).catch(() => undefined);
  };

  const handleAddToCart = () => {
    const unitLabel = selectedWeight?.label ?? product.unitLabel;
    addItem(
      {
        productId: product.id,
        weightOptionId: selectedWeight?.id ?? null,
        name: `${product.name} (${unitLabel})`,
        imageKey: product.imageKey,
        unitLabel,
        unitPrice: displayPrice,
      },
      quantity,
    );
    showToast(STRINGS.home.addedToCart);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      {/* Contextual Header */}
      <View className="bg-surface border-b border-outline-subtle px-page-x py-md flex-row items-center justify-between gap-md">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.common.back}
          className="w-10 h-10 rounded-full bg-surface-card border border-outline-subtle items-center justify-center active:bg-mint-surface"
        >
          <ArrowRight size={20} color={colors.onSurface} />
        </Pressable>

        <Text className="font-title text-title-md text-on-surface">
          {STRINGS.productDetails.headerTitle}
        </Text>

        <View className="flex-row items-center gap-sm">
          <Pressable
            onPress={() => showToast(STRINGS.productDetails.shareSuccess)}
            accessibilityRole="button"
            accessibilityLabel={STRINGS.productDetails.shareLabel}
            className="w-10 h-10 rounded-full bg-surface-card border border-outline-subtle items-center justify-center active:bg-mint-surface"
          >
            <Share2 size={18} color={colors.onSurface} />
          </Pressable>
          <Pressable
            onPress={handleToggleFav}
            accessibilityRole="button"
            accessibilityLabel={STRINGS.profile.favorites}
            className="w-10 h-10 rounded-full bg-surface-card border border-outline-subtle items-center justify-center active:bg-mint-surface"
          >
            <Heart
              size={18}
              color={isFav ? colors.error : colors.onSurface}
              fill={isFav ? colors.error : 'transparent'}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="px-page-x pt-base pb-xl gap-lg"
        showsVerticalScrollIndicator={false}
      >
        {/* Image Gallery Card */}
        <Card className="items-center gap-md">
          <View className="w-full aspect-square rounded-md overflow-hidden bg-surface">
            <Image
              source={getLocalImage(product.imageKey)}
              contentFit="cover"
              style={{ width: '100%', height: '100%' }}
              accessibilityLabel={product.name}
            />
          </View>
          <View className="flex-row items-center gap-xs">
            <View className="w-5 h-1.5 rounded-full bg-primary" />
            <View className="w-1.5 h-1.5 rounded-full bg-soft-accent" />
            <View className="w-1.5 h-1.5 rounded-full bg-soft-accent" />
          </View>
        </Card>

        {/* Brand, Availability, Title, Price */}
        <View className="gap-sm">
          <View className="flex-row items-center justify-between gap-sm">
            <Text className="font-label text-label-md text-primary">{product.brand}</Text>
            <View className="flex-row items-center gap-xs px-sm py-xs rounded-sm bg-mint-surface">
              <CheckCircle2 size={14} color={colors.primary} />
              <Text className="font-label text-label-sm text-on-mint-surface">
                {product.stock > 0
                  ? STRINGS.productDetails.availableNow
                  : STRINGS.productDetails.outOfStock}
              </Text>
            </View>
          </View>

          <Text className="font-headline text-headline-lg text-on-surface text-right">
            {product.name}
          </Text>

          <Text className="font-body text-body-md text-on-surface-muted text-right">
            الوحدة: {product.unitLabel}
            {product.piecesPerUnit
              ? ` (${formatNumber(product.piecesPerUnit)} قطعة في الوحدة)`
              : ''}
          </Text>

          <View className="flex-row items-center gap-md">
            <Text
              className="font-headline text-headline-md text-primary"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {formatCurrency(displayPrice)}
            </Text>
            {displayOldPrice ? (
              <Text
                className="font-body text-body-md text-on-surface-subtle line-through"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatCurrency(displayOldPrice)}
              </Text>
            ) : null}
            {product.discountPercent ? (
              <Badge
                variant="mint"
                label={`${STRINGS.productDetails.savePrefix} ${product.discountPercent}%`}
              />
            ) : null}
          </View>
        </View>

        {/* Weight Selector */}
        {product.weights.length > 0 ? (
          <View className="gap-sm">
            <Text className="font-title text-title-sm text-on-surface text-right">
              {STRINGS.productDetails.chooseWeight}
            </Text>
            <View className="flex-row gap-sm">
              {product.weights.map((option) => {
                const active = option.id === selectedWeight?.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setSelectedWeightId(option.id)}
                    className={`flex-1 py-md px-sm rounded-md items-center ${
                      active
                        ? 'bg-mint-surface border-2 border-primary'
                        : 'bg-surface-card border border-outline-subtle'
                    }`}
                  >
                    <Text
                      className={`font-label text-label-md ${
                        active ? 'text-on-mint-surface' : 'text-on-surface'
                      }`}
                    >
                      {option.label}
                      {product.weights.length === 1 && product.piecesPerUnit
                        ? ` (${formatNumber(product.piecesPerUnit)} قطعة)`
                        : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Description Card */}
        <Card className="gap-xs">
          <Text className="font-title text-title-sm text-on-surface text-right">
            {STRINGS.productDetails.aboutProduct}
          </Text>
          <Text className="font-body text-body-md text-on-surface-muted text-right leading-6">
            {product.description}
          </Text>
        </Card>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View
        style={{
          paddingBottom: Math.max(insets.bottom, 12),
          shadowColor: '#1F241F',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 8,
        }}
        className="bg-surface-card border-t border-outline-subtle px-page-x pt-md flex-row items-center gap-md"
      >
        <QuantityStepper
          value={quantity}
          onIncrement={() => setQuantity((q) => q + 1)}
          onDecrement={() => setQuantity((q) => (q > 1 ? q - 1 : 1))}
        />

        <Button
          variant="primary"
          size="lg"
          disabled={product.stock === 0}
          onPress={handleAddToCart}
          className="flex-1"
        >
          <ShoppingBag size={20} color={colors.onPrimary} />
          <Text className="font-label-bold text-label-lg text-on-primary">
            {STRINGS.productDetails.addToCart}
          </Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
