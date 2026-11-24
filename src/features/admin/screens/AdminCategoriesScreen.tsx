import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { Plus, X } from 'lucide-react-native';
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
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/features/categories/hooks/useCategories';
import { formatNumber } from '@/lib/format';
import { getLocalImage } from '@/lib/images';
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
  const { mutateAsync: deleteCategory } = useDeleteCategory();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

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
    reset({ name: '', isActive: true });
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    reset({ name: cat.name, isActive: cat.isActive });
    setModalOpen(true);
  };

  const onSubmit = async (values: CategoryForm) => {
    if (editing) {
      await updateCategory({ id: editing.id, payload: values });
    } else {
      await createCategory(values);
    }
    showToast(STRINGS.admin.categorySaved);
    setModalOpen(false);
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
                      className="flex-1 py-xs rounded-sm bg-surface items-center"
                    >
                      <Text className="font-label text-label-sm text-primary">
                        {STRINGS.common.edit}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={async () => {
                        await deleteCategory(cat.id);
                        showToast(STRINGS.admin.categoryDeleted);
                      }}
                      className="flex-1 py-xs rounded-sm bg-surface items-center"
                    >
                      <Text className="font-label text-label-sm text-error">
                        {STRINGS.common.delete}
                      </Text>
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
        onRequestClose={() => setModalOpen(false)}
      >
        <Pressable
          className="flex-1 bg-on-surface/40 justify-end"
          onPress={() => setModalOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-surface-card rounded-t-xl p-lg gap-md border-t border-outline-subtle"
          >
            <View className="flex-row items-center justify-between pb-sm border-b border-outline-subtle">
              <Text className="font-headline text-title-lg text-on-surface">
                {editing ? STRINGS.common.edit : STRINGS.admin.newCategoryBtn}
              </Text>
              <Pressable onPress={() => setModalOpen(false)}>
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

            <Button
              variant="primary"
              size="lg"
              isLoading={isCreating || isUpdating}
              label={STRINGS.common.save}
              onPress={() => handleSubmit(onSubmit)()}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
