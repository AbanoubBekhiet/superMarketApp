import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { STRINGS } from '@/constants/strings';
import {
  reserveCategoryId,
  uploadCategoryImageFromUri,
} from '@/features/categories/api/categoriesApi';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/features/categories/hooks/useCategories';
import { formatNumber } from '@/lib/format';
import { getLocalImage } from '@/lib/images';
import { pickAndUploadEntityImage } from '@/lib/imageUpload';
import { deleteStorageImage } from '@/services/firebase/app';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';
import type { Category } from '@/types/domain';

const categorySchema = z.object({
  name: z.string().trim().min(2, STRINGS.common.requiredField),
  isActive: z.boolean(),
});

type CategoryForm = z.infer<typeof categorySchema>;

export function AdminCategoriesScreen() {
  const showToast = useUiStore((s) => s.showToast);
  const { data: categories = [], isLoading, isError, refetch } = useCategories();
  const { mutateAsync: createCategory, isPending: isCreating } = useCreateCategory();
  const { mutateAsync: updateCategory, isPending: isUpdating } = useUpdateCategory();
  const { mutateAsync: deleteCategory, isPending: isDeleting } = useDeleteCategory();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [draftCategoryId, setDraftCategoryId] = useState<string>(() => reserveCategoryId());
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', isActive: true },
  });

  const openAdd = () => {
    setEditing(null);
    setDraftCategoryId(reserveCategoryId());
    setImageUrl(null);
    setPreviewUri(null);
    reset({ name: '', isActive: true });
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setDraftCategoryId(cat.id);
    setImageUrl(cat.imageKey);
    setPreviewUri(null);
    reset({ name: cat.name, isActive: cat.isActive });
    setModalOpen(true);
  };

  const closeModalWithoutClean = () => {
    setModalOpen(false);
    setEditing(null);
    setDraftCategoryId(reserveCategoryId());
    setImageUrl(null);
    setPreviewUri(null);
  };

  const handleCloseModal = () => {
    if (imageUrl && imageUrl !== editing?.imageKey) {
      void deleteStorageImage(imageUrl).catch(() => undefined);
    }
    closeModalWithoutClean();
  };

  const handlePickImage = () =>
    pickAndUploadEntityImage({
      previousSavedImageUrl: editing?.imageKey,
      currentImageUrl: imageUrl,
      resolveEntityId: () => {
        const targetId = editing?.id || draftCategoryId || reserveCategoryId();
        if (!editing?.id && !draftCategoryId) {
          setDraftCategoryId(targetId);
        }
        return targetId;
      },
      uploadImage: uploadCategoryImageFromUri,
      onPreview: setPreviewUri,
      onUploadingChange: setIsUploadingImage,
      onUploaded: setImageUrl,
      onSuccess: () => showToast(STRINGS.admin.imageUploaded),
      onError: (msg) => showToast(msg, 'error'),
    });

  const onSubmit = async (values: CategoryForm) => {
    if (isUploadingImage) {
      showToast(STRINGS.admin.uploadingImage);
      return;
    }
    try {
      const payload = {
        ...values,
        ...(imageUrl ? { imageUrl } : {}),
      };
      if (editing) {
        await updateCategory({ id: editing.id, payload });
      } else {
        await createCategory({ id: draftCategoryId, ...payload });
      }
      showToast(STRINGS.admin.categorySaved);
      closeModalWithoutClean();
    } catch (err) {
      const msg = err instanceof Error ? err.message : STRINGS.common.errorMessage;
      showToast(msg || STRINGS.common.errorMessage, 'error');
    }
  };

  const rows: Category[][] = [];
  for (let i = 0; i < categories.length; i += 2) {
    rows.push(categories.slice(i, i + 2));
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <ScreenHeader
        title={STRINGS.admin.categoriesTitle}
        leftSlot={
          <Button variant="primary" size="sm" onPress={openAdd}>
            <Plus size={16} color={colors.onPrimary} />
            <Text className="font-label text-label-md text-on-primary">
              {STRINGS.admin.newCategoryBtn}
            </Text>
          </Button>
        }
      />

      {isLoading ? (
        <ListSkeleton count={3} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : categories.length === 0 ? (
        <EmptyState />
      ) : (
        <ScrollView
          contentContainerClassName="px-page-x pt-base pb-xl gap-md"
          showsVerticalScrollIndicator={false}
        >
          {rows.map((pair, idx) => (
            <View key={idx} className="flex-row gap-md items-stretch">
              {pair.map((cat) => (
                <Card key={cat.id} padded={false} className="flex-1 p-md justify-between gap-sm">
                  <View className="items-center gap-xs">
                    <View className="w-16 h-16 rounded-lg bg-mint-surface border border-outline p-xs overflow-hidden">
                      <Image
                        source={getLocalImage(cat.imageKey)}
                        contentFit="cover"
                        style={{ width: '100%', height: '100%', borderRadius: 10 }}
                        accessibilityLabel={cat.name}
                      />
                    </View>
                    <Text className="font-title text-title-sm text-on-surface text-center">
                      {cat.name}
                    </Text>
                    <Text
                      className="font-body text-body-sm text-on-surface-subtle text-center"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {formatNumber(cat.productCount)} {STRINGS.admin.productsCountSuffix}
                    </Text>
                  </View>

                  <View className="flex-row gap-xs pt-xs border-t border-outline-subtle">
                    <Pressable
                      onPress={() => openEdit(cat)}
                      accessibilityRole="button"
                      accessibilityLabel={STRINGS.common.edit}
                      className="flex-1 py-xs rounded-sm bg-surface items-center justify-center active:bg-mint-surface"
                    >
                      <Pencil size={16} color={colors.primary} />
                    </Pressable>
                    <Pressable
                      onPress={() => setDeletingCategory(cat)}
                      accessibilityRole="button"
                      accessibilityLabel={STRINGS.common.delete}
                      className="flex-1 py-xs rounded-sm bg-surface items-center justify-center active:bg-error-container"
                    >
                      <Trash2 size={16} color={colors.error} />
                    </Pressable>
                  </View>
                </Card>
              ))}
              {pair.length === 1 ? <View className="flex-1" /> : null}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add / Edit Category Modal */}
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
            className="bg-surface-card rounded-t-xl p-lg gap-md border-t border-outline-subtle"
          >
            <View className="flex-row items-center justify-between pb-sm border-b border-outline-subtle">
              <Text className="font-headline text-title-lg text-on-surface">
                {editing ? STRINGS.common.edit : STRINGS.admin.newCategoryBtn}
              </Text>
              <Pressable onPress={handleCloseModal}>
                <X size={20} color={colors.onSurfaceMuted} />
              </Pressable>
            </View>

            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={STRINGS.admin.categoryNameLabel}
                  placeholder={STRINGS.admin.categoryNamePlaceholder}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.name?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="isActive"
              render={({ field: { onChange, value } }) => (
                <View className="flex-row items-center justify-between py-xs">
                  <Text className="font-label text-label-md text-on-surface">
                    {STRINGS.admin.categoryActiveLabel}
                  </Text>
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: colors.outlineSubtle, true: colors.mintSurface }}
                    thumbColor={value ? colors.primary : colors.onSurfaceSubtle}
                  />
                </View>
              )}
            />

            <View className="flex-row items-center gap-md">
              <View className="w-16 h-16 rounded-lg bg-mint-surface border border-outline overflow-hidden">
                <Image
                  source={getLocalImage(previewUri ?? imageUrl ?? editing?.imageKey ?? 'local://logo')}
                  contentFit="cover"
                  style={{ width: '100%', height: '100%' }}
                  accessibilityLabel={editing?.name ?? STRINGS.admin.categoryNameLabel}
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
              label={STRINGS.common.save}
              onPress={() => handleSubmit(onSubmit)()}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Category Confirmation Modal */}
      <Modal
        visible={deletingCategory !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeletingCategory(null)}
      >
        <Pressable
          className="flex-1 bg-on-surface/40 justify-center px-page-x"
          onPress={() => setDeletingCategory(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-surface-card rounded-xl p-lg gap-md border border-outline-subtle"
          >
            <View className="flex-row items-center justify-between pb-sm border-b border-outline-subtle">
              <Text className="font-headline text-title-lg text-on-surface">
                {STRINGS.admin.confirmDeleteTitle}
              </Text>
              <Pressable onPress={() => setDeletingCategory(null)} hitSlop={8}>
                <X size={20} color={colors.onSurfaceMuted} />
              </Pressable>
            </View>

            <Text className="font-body text-body-md text-on-surface-muted text-right">
              {deletingCategory
                ? `هل أنت متأكد من حذف قسم «${deletingCategory.name}»؟ لا يمكن التراجع عن هذا الإجراء.`
                : STRINGS.admin.confirmDeleteCategoryMsg}
            </Text>

            <View className="flex-row gap-sm pt-xs">
              <Button
                variant="danger"
                size="md"
                isLoading={isDeleting}
                label={STRINGS.common.delete}
                onPress={async () => {
                  if (!deletingCategory) return;
                  await deleteCategory(deletingCategory.id);
                  showToast(STRINGS.admin.categoryDeleted);
                  setDeletingCategory(null);
                }}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="md"
                label={STRINGS.common.cancel}
                onPress={() => setDeletingCategory(null)}
                className="flex-1"
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
