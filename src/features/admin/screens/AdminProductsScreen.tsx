import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { STRINGS } from '@/constants/strings';
import {
  useCreateProduct,
  useDeleteProduct,
  useProducts,
  useUpdateProduct,
} from '@/features/products/hooks/useProducts';
import { formatCurrency, formatNumber } from '@/lib/format';
import { getLocalImage } from '@/lib/images';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';
import type { Product } from '@/types/domain';

const quickProductSchema = z.object({
  name: z.string().trim().min(2, STRINGS.common.requiredField),
  price: z.coerce.number().positive(STRINGS.common.positiveNumber),
  stock: z.coerce.number().min(0, STRINGS.common.invalidNumber),
});

type QuickProductForm = z.input<typeof quickProductSchema>;
type QuickProductParsed = z.infer<typeof quickProductSchema>;

export function AdminProductsScreen() {
  const showToast = useUiStore((s) => s.showToast);
  const { data: products = [], isLoading, isError, refetch } = useProducts();
  const { mutateAsync: createProduct, isPending: isCreating } = useCreateProduct();
  const { mutateAsync: updateProduct, isPending: isUpdating } = useUpdateProduct();
  const { mutateAsync: deleteProduct } = useDeleteProduct();

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuickProductForm, unknown, QuickProductParsed>({
    resolver: zodResolver(quickProductSchema),
    defaultValues: {
      name: '',
      price: '',
      stock: '',
    },
  });

  const handleSelectEdit = (product: Product) => {
    setEditingProduct(product);
    reset({
      name: product.name,
      price: String(product.price),
      stock: String(product.stock),
    });
  };

  const handleResetNew = () => {
    setEditingProduct(null);
    reset({ name: '', price: '', stock: '' });
  };

  const onSubmit = async (values: QuickProductParsed) => {
    if (editingProduct) {
      await updateProduct({
        id: editingProduct.id,
        payload: { name: values.name, price: values.price, stock: values.stock },
      });
    } else {
      await createProduct({
        name: values.name,
        price: values.price,
        stock: values.stock,
      });
    }
    showToast(STRINGS.admin.productSaved);
    handleResetNew();
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <ScreenHeader
        title={STRINGS.admin.productsTitle}
        leftSlot={
          <Button variant="primary" size="sm" onPress={handleResetNew}>
            <Plus size={16} color={colors.onPrimary} />
            <Text className="font-label text-label-md text-on-primary">
              {STRINGS.admin.newProductBtn}
            </Text>
          </Button>
        }
      />

      <ScrollView
        contentContainerClassName="px-page-x pt-base pb-xl gap-base"
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ListSkeleton count={3} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : (
          <View className="gap-md">
            {products.map((product) => {
              const stockVariant =
                product.stock === 0 ? 'error' : product.stock <= 10 ? 'warning' : 'mint';
              return (
                <Card
                  key={product.id}
                  padded={false}
                  className="p-md flex-row items-center gap-md"
                >
                  <Image
                    source={getLocalImage(product.imageKey)}
                    contentFit="cover"
                    style={{ width: 56, height: 56, borderRadius: 12 }}
                    accessibilityLabel={product.name}
                  />
                  <View className="flex-1 min-w-0 gap-xs">
                    <View className="flex-row items-center justify-between gap-xs">
                      <Text
                        className="flex-1 font-title text-title-sm text-on-surface text-right"
                        numberOfLines={1}
                      >
                        {product.name}
                      </Text>
                      <Badge
                        variant={stockVariant}
                        label={`${formatNumber(product.stock)} ${product.stockUnit}`}
                      />
                    </View>
                    <View className="flex-row items-center justify-between gap-xs">
                      <Text
                        className="font-headline text-title-sm text-primary"
                        style={{ fontVariant: ['tabular-nums'] }}
                      >
                        {formatCurrency(product.price)}
                      </Text>
                      <View className="flex-row items-center gap-md">
                        <Pressable onPress={() => handleSelectEdit(product)} hitSlop={8}>
                          <Text className="font-label text-label-md text-primary">
                            {STRINGS.common.edit}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={async () => {
                            await deleteProduct(product.id);
                            showToast(STRINGS.admin.productDeleted);
                          }}
                          hitSlop={8}
                        >
                          <Text className="font-label text-label-md text-error">
                            {STRINGS.common.delete}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* Quick Add / Edit Product Form */}
        <Card className="gap-md">
          <View className="flex-row items-center justify-between pb-xs border-b border-outline-subtle">
            <Text className="font-headline text-title-md text-on-surface">
              {STRINGS.admin.quickFormTitle}
            </Text>
            {editingProduct ? (
              <Pressable onPress={handleResetNew}>
                <Text className="font-label text-label-sm text-error">
                  {STRINGS.common.cancel}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={STRINGS.admin.productNameLabel}
                placeholder={STRINGS.admin.productNamePlaceholder}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
              />
            )}
          />

          <View className="flex-row gap-sm">
            <View className="flex-1">
              <Controller
                control={control}
                name="price"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={STRINGS.admin.productPriceLabel}
                    placeholder="48"
                    value={String(value ?? '')}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="numeric"
                    error={errors.price?.message}
                  />
                )}
              />
            </View>
            <View className="flex-1">
              <Controller
                control={control}
                name="stock"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={STRINGS.admin.productStockLabel}
                    placeholder="65"
                    value={String(value ?? '')}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="numeric"
                    error={errors.stock?.message}
                  />
                )}
              />
            </View>
          </View>

          <Button
            variant="mint-outline"
            size="lg"
            isLoading={isCreating || isUpdating}
            label={STRINGS.admin.saveProductBtn}
            onPress={() => handleSubmit(onSubmit)()}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
