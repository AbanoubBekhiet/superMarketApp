import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { STRINGS } from '@/constants/strings';
import { formatCurrency } from '@/lib/format';
import { getLocalImage } from '@/lib/images';
import { useCartStore } from '@/store/cartStore';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';
import type { Product } from '@/types/domain';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUiStore((s) => s.showToast);

  const handleOpenDetails = () => {
    router.push({
      pathname: '/(user)/product/[id]',
      params: { id: product.id },
    });
  };

  const handleQuickAdd = () => {
    const defaultWeight = product.weights[0];
    addItem({
      productId: product.id,
      weightOptionId: defaultWeight?.id ?? product.id,
      name: `${product.name} (${product.unitLabel})`,
      imageKey: product.imageKey,
      unitLabel: product.unitLabel,
      unitPrice: product.price,
    });
    showToast(STRINGS.home.addedToCart);
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
      <Pressable
        onPress={handleOpenDetails}
        accessibilityRole="button"
        accessibilityLabel={product.name}
        className="gap-sm"
      >
        <View className="relative bg-surface rounded-md aspect-square overflow-hidden">
          <Image
            source={getLocalImage(product.imageKey)}
            contentFit="cover"
            style={{ width: '100%', height: '100%' }}
            accessibilityLabel={product.name}
          />
          {badgeLabel ? (
            <View className="absolute top-2 start-2">
              <Badge variant="mint" label={badgeLabel} />
            </View>
          ) : null}
        </View>

        <View className="gap-xs">
          <Text
            className="font-title text-title-sm text-on-surface-card text-right"
            numberOfLines={2}
          >
            {product.name}
          </Text>
          <Text className="font-body text-body-sm text-on-surface-subtle text-right">
            {product.unitLabel}
          </Text>
        </View>
      </Pressable>

      <View className="flex-row items-center justify-between gap-xs pt-xs">
        <View className="flex-1">
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

        <Pressable
          onPress={handleQuickAdd}
          hitSlop={6}
          disabled={product.stock === 0}
          accessibilityRole="button"
          accessibilityLabel={`${STRINGS.productDetails.addToCart} ${product.name}`}
          className={`w-9 h-9 rounded-full bg-primary active:bg-primary-hover items-center justify-center ${
            product.stock === 0 ? 'opacity-40' : ''
          }`}
        >
          <Plus size={20} color={colors.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
}
