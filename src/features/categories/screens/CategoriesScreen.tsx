import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { ArrowUpDown, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FilterChip } from '@/components/ui/Chip';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { STRINGS } from '@/constants/strings';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { ProductCard } from '@/features/products/components/ProductCard';
import { useProducts } from '@/features/products/hooks/useProducts';
import { getLocalImage } from '@/lib/images';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';
import type { Product } from '@/types/domain';

type SortMode = 'default' | 'price_asc' | 'price_desc' | 'offers';

export function CategoriesScreen() {
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const { data: categories = [] } = useCategories();

  const [selection, setSelection] = useState<{
    paramId?: string;
    categoryId: string;
    subcategoryId: string;
  } | null>(null);
  const selectedCategoryId =
    selection && selection.paramId === params.categoryId
      ? selection.categoryId
      : (params.categoryId ?? categories[0]?.id ?? '');
  const selectedSubcategoryId =
    selection && selection.paramId === params.categoryId ? selection.subcategoryId : 'all';
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('default');
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [offersOnly, setOffersOnly] = useState(false);

  const showToast = useUiStore((s) => s.showToast);
  const pendingCategoryToastRef = useRef<string | null>(null);

  const activeCategory =
    categories.find((c) => c.id === selectedCategoryId) ?? categories[0];

  const {
    data: products = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useProducts({
    categoryId: activeCategory?.id,
    subcategoryId: selectedSubcategoryId,
    search: search.trim() || undefined,
    sort,
  });

  useEffect(() => {
    if (!isLoading && !isFetching && pendingCategoryToastRef.current) {
      const catName = pendingCategoryToastRef.current;
      pendingCategoryToastRef.current = null;
      showToast(`تم جلب منتجات قسم ${catName}`);
    }
  }, [activeCategory?.id, isFetching, isLoading, showToast]);

  const displayedProducts = offersOnly
    ? products.filter((p) => Boolean(p.discountPercent || p.oldPrice))
    : products;

  const categoryRows: typeof categories[] = [];
  const activeCategories = categories.filter((c) => c.isActive);
  for (let i = 0; i < activeCategories.length; i += 3) {
    categoryRows.push(activeCategories.slice(i, i + 3));
  }

  const productRows: Product[][] = [];
  for (let i = 0; i < displayedProducts.length; i += 2) {
    productRows.push(displayedProducts.slice(i, i + 2));
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      {/* Header */}
      <View className="bg-surface border-b border-outline-subtle px-page-x py-md flex-row items-center justify-between gap-md">
        <Text className="font-headline text-headline-md text-on-surface">
          {STRINGS.categories.title}
        </Text>
        <Pressable
          onPress={() => setSearchOpen((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.common.search}
          className="w-10 h-10 rounded-full bg-surface-card border border-outline-subtle items-center justify-center active:bg-mint-surface"
        >
          {searchOpen ? (
            <X size={20} color={colors.onSurface} />
          ) : (
            <Search size={20} color={colors.onSurface} />
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="px-page-x pt-base pb-xl gap-section"
        showsVerticalScrollIndicator={false}
      >
        {searchOpen ? (
          <View className="flex-row items-center bg-surface-card border border-outline-subtle rounded-md px-md min-h-[44px]">
            <Search size={18} color={colors.onSurfaceSubtle} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={STRINGS.categories.searchPlaceholder}
              placeholderTextColor={colors.onSurfaceSubtle}
              textAlign="right"
              className="flex-1 font-body text-body-md text-on-surface px-sm"
            />
          </View>
        ) : null}

        {/* All Supermarket Categories 3-Column Grid */}
        <View className="gap-md">
          {categoryRows.map((row, idx) => (
            <View key={idx} className="flex-row gap-md items-stretch">
              {row.map((cat) => {
                const isSelected = cat.id === activeCategory?.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => {
                      pendingCategoryToastRef.current = cat.name;
                      if (cat.id === activeCategory?.id) {
                        void refetch();
                      } else {
                        setSelection({
                          paramId: params.categoryId,
                          categoryId: cat.id,
                          subcategoryId: 'all',
                        });
                      }
                    }}
                    className={`flex-1 bg-mint-surface rounded-lg p-sm items-center gap-xs ${
                      isSelected ? 'border-2 border-primary' : 'border border-outline'
                    }`}
                  >
                    <View className="w-16 h-16 rounded-md bg-surface-card overflow-hidden p-xs">
                      <Image
                        source={getLocalImage(cat.imageKey)}
                        contentFit="cover"
                        style={{ width: '100%', height: '100%', borderRadius: 6 }}
                        accessibilityLabel={cat.name}
                      />
                    </View>
                    <Text
                      className="font-title text-title-sm text-on-mint-surface text-center"
                      numberOfLines={2}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
              {row.length < 3
                ? Array.from({ length: 3 - row.length }).map((_, emptyIdx) => (
                    <View key={`empty-${emptyIdx}`} className="flex-1" />
                  ))
                : null}
            </View>
          ))}
        </View>

        {/* Filtered Category View */}
        <View className="gap-md">
          <View className="flex-row items-center justify-between gap-sm">
            <Text className="font-headline text-title-lg text-on-surface">
              {activeCategory?.name ?? STRINGS.categories.title}
            </Text>
            <View className="flex-row items-center gap-xs">
              <Pressable
                onPress={() => setSortModalOpen(true)}
                className="flex-row items-center gap-xs px-md py-xs rounded-md bg-surface-card border border-outline-subtle active:border-primary"
              >
                <ArrowUpDown size={16} color={colors.primary} />
                <Text className="font-label text-label-md text-on-surface">
                  {STRINGS.categories.sortLabel}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setOffersOnly((prev) => !prev)}
                className={`flex-row items-center gap-xs px-md py-xs rounded-md border ${
                  offersOnly
                    ? 'bg-mint-surface border-primary'
                    : 'bg-surface-card border-outline-subtle'
                }`}
              >
                <SlidersHorizontal size={16} color={colors.primary} />
                <Text className="font-label text-label-md text-on-surface">
                  {STRINGS.categories.filterLabel}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Subcategory Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-sm pb-xs"
          >
            <FilterChip
              label={STRINGS.common.all}
              active={selectedSubcategoryId === 'all'}
              onPress={() =>
                setSelection({
                  paramId: params.categoryId,
                  categoryId: selectedCategoryId,
                  subcategoryId: 'all',
                })
              }
            />
            {(activeCategory?.subcategories ?? []).map((sub) => (
              <FilterChip
                key={sub.id}
                label={sub.name}
                active={selectedSubcategoryId === sub.id}
                onPress={() =>
                  setSelection({
                    paramId: params.categoryId,
                    categoryId: selectedCategoryId,
                    subcategoryId: sub.id,
                  })
                }
              />
            ))}
          </ScrollView>

          {/* Products Grid */}
          {isLoading ? (
            <ListSkeleton count={2} />
          ) : isError ? (
            <ErrorState onRetry={refetch} />
          ) : displayedProducts.length === 0 ? (
            <EmptyState />
          ) : (
            <View className="gap-md">
              {productRows.map((pair, idx) => (
                <View key={idx} className="flex-row gap-md items-stretch">
                  <ProductCard product={pair[0]} />
                  {pair[1] ? <ProductCard product={pair[1]} /> : <View className="flex-1" />}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sort Modal */}
      <Modal
        visible={sortModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalOpen(false)}
      >
        <Pressable
          className="flex-1 bg-on-surface/40 justify-end"
          onPress={() => setSortModalOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-surface-card rounded-t-xl p-lg gap-sm border-t border-outline-subtle"
          >
            <Text className="font-headline text-title-lg text-on-surface text-right pb-xs">
              {STRINGS.categories.sortLabel}
            </Text>
            {(
              [
                ['default', STRINGS.categories.sortOptions.default],
                ['price_asc', STRINGS.categories.sortOptions.priceAsc],
                ['price_desc', STRINGS.categories.sortOptions.priceDesc],
                ['offers', STRINGS.categories.sortOptions.offers],
              ] as const
            ).map(([key, label]) => (
              <Pressable
                key={key}
                onPress={() => {
                  setSort(key);
                  setSortModalOpen(false);
                }}
                className={`p-md rounded-md border ${
                  sort === key
                    ? 'bg-mint-surface border-primary'
                    : 'bg-surface border-outline-subtle'
                }`}
              >
                <Text className="font-label text-label-md text-on-surface text-right">
                  {label}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
