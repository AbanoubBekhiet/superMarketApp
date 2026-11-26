import { zodResolver } from '@hookform/resolvers/zod';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FilterChip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { STRINGS } from '@/constants/strings';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { reserveProductId, uploadProductImageFromUri } from '@/features/products/api/productsApi';
import {
  useCreateProduct,
  useDeleteProduct,
  useProducts,
  useUpdateProduct,
} from '@/features/products/hooks/useProducts';
import { formatCurrency, formatNumber } from '@/lib/format';
import { getLocalImage } from '@/lib/images';
import { pickAndUploadEntityImage } from '@/lib/imageUpload';
import { deleteStorageImage } from '@/services/firebase/app';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';
import type { Product } from '@/types/domain';

const PAGE_SIZE = 12;

const quickProductSchema = z.object({
  name: z.string().trim().min(2, STRINGS.common.requiredField),
  price: z.coerce.number().positive(STRINGS.common.positiveNumber),
  categoryId: z.string().optional(),
});

type QuickProductForm = z.input<typeof quickProductSchema>;
type QuickProductParsed = z.infer<typeof quickProductSchema>;

export function AdminProductsScreen() {
  const showToast = useUiStore((s) => s.showToast);
  const { data: products = [], isLoading, isError, refetch } = useProducts();
  const { data: categories = [] } = useCategories();
  const { mutateAsync: createProduct, isPending: isCreating } = useCreateProduct();
  const { mutateAsync: updateProduct, isPending: isUpdating } = useUpdateProduct();
  const { mutateAsync: deleteProduct, isPending: isDeleting } = useDeleteProduct();

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [draftProductId, setDraftProductId] = useState<string>(() => reserveProductId());
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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
      categoryId: '',
    },
  });

  const openAddModal = () => {
    setEditingProduct(null);
    setDraftProductId(reserveProductId());
    setImageUrl(null);
    setPreviewUri(null);
    reset({
      name: '',
      price: '',
      categoryId: categories[0]?.id ?? '',
    });
    setModalOpen(true);
  };

  const handleSelectEdit = (product: Product) => {
    setEditingProduct(product);
    setDraftProductId(product.id);
    setImageUrl(product.imageKey);
    setPreviewUri(null);
    reset({
      name: product.name,
      price: String(product.price),
      categoryId: product.categoryId,
    });
    setModalOpen(true);
  };

  const closeModalWithoutClean = () => {
    setModalOpen(false);
    setEditingProduct(null);
    setDraftProductId(reserveProductId());
    setImageUrl(null);
    setPreviewUri(null);
  };

  const handleCloseModal = () => {
    if (imageUrl && imageUrl !== editingProduct?.imageKey) {
      void deleteStorageImage(imageUrl).catch(() => undefined);
    }
    closeModalWithoutClean();
  };

  const handlePickImage = () =>
    pickAndUploadEntityImage({
      previousSavedImageUrl: editingProduct?.imageKey,
      currentImageUrl: imageUrl,
      resolveEntityId: () => {
        const targetId = editingProduct?.id || draftProductId || reserveProductId();
        if (!editingProduct?.id && !draftProductId) {
          setDraftProductId(targetId);
        }
        return targetId;
      },
      uploadImage: uploadProductImageFromUri,
      onPreview: setPreviewUri,
      onUploadingChange: setIsUploadingImage,
      onUploaded: setImageUrl,
      onSuccess: () => showToast(STRINGS.admin.imageUploaded),
      onError: (msg) => showToast(msg, 'error'),
    });

  const onSubmit = async (values: QuickProductParsed) => {
    if (isUploadingImage) {
      showToast(STRINGS.admin.uploadingImage);
      return;
    }
    const resolvedCategoryId = values.categoryId || categories[0]?.id;
    try {
      if (editingProduct) {
        await updateProduct({
          id: editingProduct.id,
          payload: {
            name: values.name,
            price: values.price,
            categoryId: resolvedCategoryId,
            ...(imageUrl ? { imageUrl } : {}),
          },
        });
      } else {
        await createProduct({
          id: draftProductId,
          name: values.name,
          price: values.price,
          categoryId: resolvedCategoryId,
          ...(imageUrl ? { imageUrl } : {}),
        });
      }
      showToast(STRINGS.admin.productSaved);
      closeModalWithoutClean();
    } catch (err) {
      const msg = err instanceof Error ? err.message : STRINGS.common.errorMessage;
      showToast(msg || STRINGS.common.errorMessage, 'error');
    }
  };

  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = visibleProducts.length < products.length;

  const handleLoadMore = () => {
    if (hasMore) {
      setVisibleCount((prev) => Math.min(products.length, prev + PAGE_SIZE));
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <ScreenHeader
        title={STRINGS.admin.productsTitle}
        leftSlot={
          <Button variant="primary" size="sm" onPress={openAddModal}>
            <Plus size={16} color={colors.onPrimary} />
            <Text className="font-label text-label-md text-on-primary">
              {STRINGS.admin.newProductBtn}
            </Text>
          </Button>
        }
      />

      {isLoading ? (
        <ListSkeleton count={4} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : products.length === 0 ? (
        <EmptyState />
      ) : (
        <FlashList
          data={visibleProducts}
          keyExtractor={(item) => item.id}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}
          renderItem={({ item: product }) => (
            <Card
              padded={false}
              className="p-md flex-row items-center gap-md mb-md"
            >
              <Image
                source={getLocalImage(product.imageKey)}
                contentFit="cover"
                style={{ width: 58, height: 58, borderRadius: 12 }}
                accessibilityLabel={product.name}
              />
              <View className="flex-1 min-w-0 gap-xs">
                <Text
                  className="font-title text-title-sm text-on-surface text-right"
                  numberOfLines={1}
                >
                  {product.name}
                </Text>
                {product.categoryName ? (
                  <Text className="font-body text-body-sm text-on-surface-subtle text-right" numberOfLines={1}>
                    {product.categoryName}
                  </Text>
                ) : null}
                <View className="flex-row items-center justify-between gap-xs pt-xs">
                  <Text
                    className="font-headline text-title-sm text-primary"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {formatCurrency(product.price)}
                  </Text>
                  <View className="flex-row items-center gap-xs">
                    <Pressable
                      onPress={() => handleSelectEdit(product)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={STRINGS.common.edit}
                      className="w-8 h-8 rounded-md bg-surface border border-outline-subtle items-center justify-center active:bg-mint-surface"
                    >
                      <Pencil size={15} color={colors.primary} />
                    </Pressable>
                    <Pressable
                      onPress={() => setDeletingProduct(product)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={STRINGS.common.delete}
                      className="w-8 h-8 rounded-md bg-surface border border-outline-subtle items-center justify-center active:bg-error-container"
                    >
                      <Trash2 size={15} color={colors.error} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </Card>
          )}
          ListFooterComponent={
            products.length > 0 ? (
              <View className="py-md items-center gap-xs">
                {hasMore ? <ActivityIndicator size="small" color={colors.primary} /> : null}
                <Text
                  className="font-body text-body-sm text-on-surface-subtle"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  عرض {formatNumber(visibleProducts.length)} من {formatNumber(products.length)}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Add / Edit Product Modal */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <Pressable
          className="flex-1 bg-on-surface/40 justify-end"
          onPress={handleCloseModal}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-surface-card rounded-t-xl p-lg gap-md border-t border-outline-subtle max-h-[85%]"
          >
            <View className="flex-row items-center justify-between pb-sm border-b border-outline-subtle">
              <Text className="font-headline text-title-lg text-on-surface">
                {editingProduct ? STRINGS.common.edit : STRINGS.admin.newProductBtn}
              </Text>
              <Pressable onPress={handleCloseModal} hitSlop={8}>
                <X size={20} color={colors.onSurfaceMuted} />
              </Pressable>
            </View>

            <ScrollView contentContainerClassName="gap-md" showsVerticalScrollIndicator={false}>
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

              {categories.length > 0 ? (
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field: { value, onChange } }) => (
                    <View className="gap-xs">
                      <Text className="font-label text-label-md text-on-surface text-right">
                        {STRINGS.admin.productCategoryLabel}
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerClassName="gap-xs"
                      >
                        {categories.map((cat) => (
                          <FilterChip
                            key={cat.id}
                            label={cat.name}
                            active={(value || categories[0]?.id) === cat.id}
                            onPress={() => onChange(cat.id)}
                          />
                        ))}
                      </ScrollView>
                    </View>
                  )}
                />
              ) : null}

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

              <View className="flex-row items-center gap-md">
                <View className="w-16 h-16 rounded-lg bg-mint-surface border border-outline overflow-hidden">
                  <Image
                    source={getLocalImage(previewUri ?? imageUrl ?? editingProduct?.imageKey ?? 'local://logo')}
                    contentFit="cover"
                    style={{ width: '100%', height: '100%' }}
                    accessibilityLabel={editingProduct?.name ?? STRINGS.admin.productNameLabel}
                  />
                </View>
                <Button
                  variant="mint"
                  size="md"
                  isLoading={isUploadingImage}
                  onPress={handlePickImage}
                  className="flex-1"
                >
                  <ImagePlus size={16} color={colors.primary} />
                  <Text className="font-label-bold text-label-md text-on-mint-surface">
                    {isUploadingImage
                      ? STRINGS.admin.uploadingImage
                      : imageUrl
                        ? STRINGS.admin.changeImageBtn
                        : STRINGS.admin.pickImageBtn}
                  </Text>
                </Button>
              </View>

              <Button
                variant="primary"
                size="lg"
                disabled={isUploadingImage}
                isLoading={isCreating || isUpdating || isUploadingImage}
                label={STRINGS.admin.saveProductBtn}
                onPress={() => handleSubmit(onSubmit)()}
              />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Product Confirmation Modal */}
      <Modal
        visible={deletingProduct !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeletingProduct(null)}
      >
        <Pressable
          className="flex-1 bg-on-surface/40 justify-center px-page-x"
          onPress={() => setDeletingProduct(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-surface-card rounded-xl p-lg gap-md border border-outline-subtle"
          >
            <View className="flex-row items-center justify-between pb-sm border-b border-outline-subtle">
              <Text className="font-headline text-title-lg text-on-surface">
                {STRINGS.admin.confirmDeleteTitle}
              </Text>
              <Pressable onPress={() => setDeletingProduct(null)} hitSlop={8}>
                <X size={20} color={colors.onSurfaceMuted} />
              </Pressable>
            </View>

            <Text className="font-body text-body-md text-on-surface-muted text-right">
              {deletingProduct
                ? `هل أنت متأكد من حذف منتج «${deletingProduct.name}»؟ لا يمكن التراجع عن هذا الإجراء.`
                : STRINGS.admin.confirmDeleteProductMsg}
            </Text>

            <View className="flex-row gap-sm pt-xs">
              <Button
                variant="danger"
                size="md"
                isLoading={isDeleting}
                label={STRINGS.common.delete}
                onPress={async () => {
                  if (!deletingProduct) return;
                  await deleteProduct(deletingProduct.id);
                  showToast(STRINGS.admin.productDeleted);
                  setDeletingProduct(null);
                }}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="md"
                label={STRINGS.common.cancel}
                onPress={() => setDeletingProduct(null)}
                className="flex-1"
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
