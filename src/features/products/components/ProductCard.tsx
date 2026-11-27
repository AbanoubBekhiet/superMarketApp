import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Heart, Minus, Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { STRINGS } from '@/constants/strings';
import { useFavoriteIds, useToggleFavorite } from '@/features/profile/hooks/useProfile';
import { formatCurrency, formatNumber } from '@/lib/format';
import { getLocalImage } from '@/lib/images';
import { useCartStore } from '@/store/cartStore';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';
import type { Product } from '@/types/domain';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const localFavIds = useCartStore((s) => s.favoriteIds);
  const toggleLocalFav = useCartStore((s) => s.toggleFavoriteLocal);
  const showToast = useUiStore((s) => s.showToast);

  const { data: remoteFavIds, isSuccess: favsLoaded } = useFavoriteIds();
  const { mutateAsync: toggleRemoteFav } = useToggleFavorite();
  const favoriteIds = favsLoaded ? remoteFavIds : localFavIds;
  const isFav = favoriteIds.includes(product.id);

  const defaultWeight = product.weights[0];
  const defaultWeightId = defaultWeight?.id ?? null;
  const matchingItems = cartItems.filter((i) => i.productId === product.id);
  const activeCartItem =
    matchingItems.find((i) => (i.weightOptionId ?? null) === defaultWeightId) ??
    matchingItems[0];
  const cartQty = matchingItems.reduce((sum, i) => sum + i.quantity, 0);

  const handleOpenDetails = () => {
    router.push({
      pathname: '/(user)/product/[id]',
      params: { id: product.id },
    });
  };

  const handleQuickAdd = () => {
    const unitLabel = defaultWeight?.label ?? product.unitLabel;
    addItem({
      productId: product.id,
      weightOptionId: defaultWeightId,
      name: `${product.name} (${unitLabel})`,
      imageKey: product.imageKey,
      unitLabel,
      unitPrice: defaultWeight?.price ?? product.price,
    });
    showToast(STRINGS.home.addedToCart);
  };

  const handleIncrement = () => {
    if (activeCartItem) {
      updateQuantity(product.id, activeCartItem.weightOptionId ?? null, 1);
    } else {
      handleQuickAdd();
    }
  };

  const handleDecrement = () => {
    if (activeCartItem) {
      updateQuantity(product.id, activeCartItem.weightOptionId ?? null, -1);
    }
  };

  const handleToggleFav = async () => {
    const nextFav = !isFav;
    toggleLocalFav(product.id);
    showToast(nextFav ? STRINGS.productDetails.favAdd : STRINGS.productDetails.favRemove);
    await toggleRemoteFav({ productId: product.id, currentlyFavorite: isFav }).catch(
      () => undefined,
    );
  };

  const badgeLabel =
    product.badgeText ??
    (product.discountPercent ? `خصم ${product.discountPercent}%` : undefined);

  return (
    <View
      className="flex-1 bg-surface-card border border-outline-subtle rounded-lg p-md justify-between gap-sm"
      style={{
        shadowColor: '#1F241F',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View className="gap-sm">
        <View className="relative bg-surface rounded-md aspect-square overflow-hidden">
          <Pressable
            onPress={handleOpenDetails}
            accessibilityRole="button"
            accessibilityLabel={product.name}
            className="w-full h-full"
          >
            <Image
              source={getLocalImage(product.imageKey)}
              contentFit="cover"
              style={{ width: '100%', height: '100%' }}
              accessibilityLabel={product.name}
            />
          </Pressable>
          {badgeLabel ? (
            <View className="absolute top-2 start-2" pointerEvents="none">
              <Badge variant="mint" label={badgeLabel} />
            </View>
          ) : null}
          <Pressable
            onPress={handleToggleFav}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${STRINGS.profile.favorites} ${product.name}`}
            className="absolute top-2 end-2 w-8 h-8 rounded-full bg-surface-card/90 border border-outline-subtle items-center justify-center active:bg-mint-surface"
          >
            <Heart
              size={16}
              color={isFav ? colors.error : colors.onSurfaceMuted}
              fill={isFav ? colors.error : 'transparent'}
            />
          </Pressable>
        </View>

        <Pressable
          onPress={handleOpenDetails}
          accessibilityRole="button"
          accessibilityLabel={product.name}
          className="gap-xs"
        >
          <Text
            className="font-title text-title-sm text-on-surface-card text-right"
            numberOfLines={2}
          >
            {product.name}
          </Text>
          <Text className="font-body text-body-sm text-on-surface-subtle text-right">
            {product.unitLabel}
            {product.piecesPerUnit ? ` • ${formatNumber(product.piecesPerUnit)} قطعة` : ''}
          </Text>
        </Pressable>
      </View>

      <View className="gap-sm pt-xs">
        <View className="flex-row items-baseline gap-xs flex-wrap">
          <Text
            className="font-headline text-title-md text-primary text-right"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {formatCurrency(product.price)}
          </Text>
          {product.oldPrice ? (
            <Text
              className="font-body text-body-sm text-on-surface-subtle line-through text-right"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {formatCurrency(product.oldPrice)}
            </Text>
          ) : null}
        </View>

        {cartQty > 0 ? (
          <View className="flex-row items-center justify-between bg-mint-surface border border-primary/40 rounded-full px-xs py-xs">
            <Pressable
              onPress={handleIncrement}
              hitSlop={6}
              disabled={product.stock === 0}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.productDetails.increaseQty}
              className="w-7 h-7 rounded-full bg-primary items-center justify-center active:bg-primary-hover"
            >
              <Plus size={15} color={colors.onPrimary} />
            </Pressable>

            <Text
              className="font-headline text-title-sm text-on-mint-surface min-w-[24px] text-center"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {formatNumber(cartQty)}
            </Text>

            <Pressable
              onPress={handleDecrement}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.productDetails.decreaseQty}
              className="w-7 h-7 rounded-full bg-surface-card border border-outline-subtle items-center justify-center active:bg-surface"
            >
              <Minus size={15} color={colors.onSurface} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={handleQuickAdd}
            hitSlop={6}
            disabled={product.stock === 0}
            accessibilityRole="button"
            accessibilityLabel={`${STRINGS.productDetails.addToCart} ${product.name}`}
            className={`w-full py-xs px-sm rounded-full bg-primary active:bg-primary-hover flex-row items-center justify-center gap-xs ${
              product.stock === 0 ? 'opacity-40' : ''
            }`}
          >
            <Plus size={16} color={colors.onPrimary} />
            <Text className="font-label-bold text-label-md text-on-primary">
              {STRINGS.productDetails.addToCart}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
