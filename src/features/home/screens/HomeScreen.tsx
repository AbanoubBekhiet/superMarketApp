import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Bell, ChevronDown, MapPin, Search, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { STRINGS } from '@/constants/strings';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { ProductCard } from '@/features/products/components/ProductCard';
import { useProducts } from '@/features/products/hooks/useProducts';
import { AddressPickerModal } from '@/features/profile/components/AddressPickerModal';
import { NotificationsModal } from '@/features/profile/components/NotificationsModal';
import {
  useAddresses,
  useBanners,
  useMarkAllNotificationsRead,
  useNotifications,
  useSetDefaultAddress,
} from '@/features/profile/hooks/useProfile';
import { formatCurrency, formatNumber } from '@/lib/format';
import { getLocalImage } from '@/lib/images';
import { colors } from '@/theme/tokens';
import type { Product } from '@/types/domain';

interface PromoSlide {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  imageKey: string;
  categoryId?: string | null;
  productId?: string | null;
}

const BANNER_VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 55 };

function PaginationDot({ active }: { active: boolean }) {
  const [widthAnim] = useState(() => new Animated.Value(active ? 24 : 8));
  const [heightAnim] = useState(() => new Animated.Value(active ? 10 : 8));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: active ? 24 : 8,
        duration: 240,
        useNativeDriver: false,
      }),
      Animated.timing(heightAnim, {
        toValue: active ? 10 : 8,
        duration: 240,
        useNativeDriver: false,
      }),
    ]).start();
  }, [active, heightAnim, widthAnim]);

  return (
    <Animated.View
      style={{
        width: widthAnim,
        height: heightAnim,
        borderRadius: 9999,
        backgroundColor: active ? colors.primary : colors.softAccent,
      }}
    />
  );
}

function ProductTwoColumnGrid({ items }: { items: Product[] }) {
  const rows: Product[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return (
    <View className="gap-md">
      {rows.map((pair, idx) => (
        <View key={idx} className="flex-row gap-md items-stretch">
          <ProductCard product={pair[0]} />
          {pair[1] ? <ProductCard product={pair[1]} /> : <View className="flex-1" />}
        </View>
      ))}
    </View>
  );
}

export function HomeScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const slideWidth = Math.max(280, screenWidth - 32);

  const [search, setSearch] = useState('');
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const bannerListRef = useRef<FlatList<PromoSlide> | null>(null);
  const isDraggingBannerRef = useRef(false);
  const activeSlideIndexRef = useRef(0);

  const { data: categories = [], refetch: refetchCategories } = useCategories();
  const {
    data: products = [],
    isLoading,
    isError,
    refetch,
  } = useProducts(search.trim() ? { search: search.trim() } : {});
  const { data: addresses = [] } = useAddresses();
  const { data: banners = [], refetch: refetchBanners } = useBanners();
  const { mutate: setDefaultAddress } = useSetDefaultAddress();
  const { data: notifications = [] } = useNotifications();
  const { mutate: markAllRead } = useMarkAllNotificationsRead();

  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const dailyOffers = products.filter((p) => p.isDailyOffer);
  const bestSellers = products.filter((p) => p.isBestSeller);

  const promoSlides = useMemo<PromoSlide[]>(() => {
    const bannerProductIds = new Set(
      banners.map((b) => b.productId).filter((id): id is string => Boolean(id)),
    );
    const adminBanners: PromoSlide[] = banners.map((b) => ({
      id: `banner-${b.id}`,
      tag: b.tag,
      title: b.title,
      subtitle: b.subtitle,
      ctaLabel: b.ctaLabel,
      imageKey: b.imageKey,
      categoryId: b.categoryId,
      productId: b.productId,
    }));
    const offerSlides: PromoSlide[] = products
      .filter((p) => (p.isDailyOffer || Boolean(p.discountPercent)) && !bannerProductIds.has(p.id))
      .map((p) => ({
        id: `offer-${p.id}`,
        tag: p.discountPercent ? `خصم ${p.discountPercent}%` : STRINGS.home.promoExclusiveTag,
        title: p.name,
        subtitle: p.oldPrice
          ? `${formatCurrency(p.price)} بدلاً من ${formatCurrency(p.oldPrice)}`
          : `${formatCurrency(p.price)} • ${p.unitLabel}`,
        ctaLabel: STRINGS.home.promoExclusiveCta,
        imageKey: p.imageKey,
        categoryId: p.categoryId,
        productId: p.id,
      }));
    return [...adminBanners, ...offerSlides];
  }, [banners, products]);

  useEffect(() => {
    activeSlideIndexRef.current = activeSlideIndex;
  }, [activeSlideIndex]);

  useEffect(() => {
    if (promoSlides.length <= 1 || search.trim().length > 0) return undefined;
    const timer = setInterval(() => {
      if (isDraggingBannerRef.current) return;
      const nextIndex = (activeSlideIndexRef.current + 1) % promoSlides.length;
      activeSlideIndexRef.current = nextIndex;
      setActiveSlideIndex(nextIndex);
      bannerListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, 3500);
    return () => clearInterval(timer);
  }, [promoSlides.length, search]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { index?: number | null }[] }) => {
      const idx = viewableItems[0]?.index;
      if (typeof idx === 'number') {
        activeSlideIndexRef.current = idx;
        setActiveSlideIndex(idx);
      }
    },
    [],
  );

  const handleSelectSlideDot = (idx: number) => {
    activeSlideIndexRef.current = idx;
    setActiveSlideIndex(idx);
    bannerListRef.current?.scrollToIndex({ index: idx, animated: true });
  };

  const handleOpenSlide = (slide: PromoSlide) => {
    if (slide.productId) {
      router.push({
        pathname: '/(user)/product/[id]',
        params: { id: slide.productId },
      });
      return;
    }
    if (slide.categoryId) {
      router.push({
        pathname: '/(user)/(tabs)/categories',
        params: { categoryId: slide.categoryId },
      });
      return;
    }
    router.push('/(user)/(tabs)/categories');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchBanners(), refetchCategories()]).catch(() => undefined);
    setRefreshing(false);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      {/* Top Bar */}
      <View className="bg-surface border-b border-outline-subtle px-page-x py-md flex-row items-center justify-between gap-md">
        <Pressable
          onPress={() => setAddressModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.home.deliverTo}
          className="flex-row items-center gap-sm flex-1 min-w-0"
        >
          <View className="w-9 h-9 rounded-full bg-mint-surface items-center justify-center shrink-0">
            <MapPin size={20} color={colors.primary} />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="font-body text-body-sm text-on-surface-subtle text-right">
              {STRINGS.home.deliverTo}
            </Text>
            <View className="flex-row items-center gap-xs">
              <Text className="font-title text-title-sm text-on-surface" numberOfLines={1}>
                {defaultAddress
                  ? `${defaultAddress.city}، ${defaultAddress.area}`
                  : STRINGS.home.defaultLocation}
              </Text>
              <ChevronDown size={18} color={colors.primary} />
            </View>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setNotifModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.common.notifications}
          className="relative w-10 h-10 rounded-full bg-surface-card border border-outline-subtle items-center justify-center active:bg-mint-surface"
        >
          <Bell size={20} color={colors.onSurface} />
          {unreadCount > 0 ? (
            <View className="absolute -top-1 -start-1">
              <Badge variant="numeric" label={formatNumber(unreadCount)} />
            </View>
          ) : null}
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="px-page-x pt-base pb-xl gap-section"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Search Bar */}
        <View
          className="flex-row items-center bg-surface-card border border-outline-subtle rounded-md px-md min-h-[46px]"
          style={{
            shadowColor: '#1F241F',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.03,
            shadowRadius: 6,
            elevation: 1,
          }}
        >
          <Search size={20} color={colors.onSurfaceSubtle} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={STRINGS.home.searchPlaceholder}
            placeholderTextColor={colors.onSurfaceSubtle}
            textAlign="right"
            accessibilityLabel={STRINGS.home.searchPlaceholder}
            className="flex-1 font-body text-body-md text-on-surface px-sm py-sm"
          />
          {search.length > 0 ? (
            <Pressable
              onPress={() => setSearch('')}
              hitSlop={8}
              accessibilityLabel={STRINGS.common.close}
              className="w-8 h-8 rounded-sm bg-surface-subtle items-center justify-center"
            >
              <X size={16} color={colors.onSurfaceMuted} />
            </Pressable>
          ) : null}
        </View>

        {search.trim().length > 0 ? (
          <View className="gap-md">
            <Text className="font-headline text-title-lg text-on-surface text-right">
              {STRINGS.home.searchResultsTitle}
            </Text>
            {isLoading ? (
              <ListSkeleton count={2} />
            ) : products.length === 0 ? (
              <EmptyState />
            ) : (
              <ProductTwoColumnGrid items={products} />
            )}
          </View>
        ) : (
          <>
            {/* Promo Banner & Offers Carousel (Admin Banners + Daily Offers) */}
            {promoSlides.length > 0 ? (
              <View className="gap-sm">
                <FlatList
                  ref={bannerListRef}
                  data={promoSlides}
                  horizontal
                  pagingEnabled
                  decelerationRate="fast"
                  showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0, height: 160 }}
                  contentContainerStyle={{ alignItems: 'center' }}
                  keyExtractor={(item) => item.id}
                  getItemLayout={(_, index) => ({
                    length: slideWidth,
                    offset: slideWidth * index,
                    index,
                  })}
                  onScrollBeginDrag={() => {
                    isDraggingBannerRef.current = true;
                  }}
                  onScrollEndDrag={() => {
                    isDraggingBannerRef.current = false;
                  }}
                  onScrollToIndexFailed={({ index }) => {
                    bannerListRef.current?.scrollToOffset({
                      offset: slideWidth * index,
                      animated: true,
                    });
                  }}
                  viewabilityConfig={BANNER_VIEWABILITY_CONFIG}
                  onViewableItemsChanged={onViewableItemsChanged}
                  renderItem={({ item: slide, index }) => {
                    const isPrimaryCard = index % 2 === 0;
                    return (
                      <View style={{ width: slideWidth, height: 152 }}>
                        {isPrimaryCard ? (
                          <View
                            className="bg-primary rounded-lg overflow-hidden flex-row items-stretch h-[152px]"
                            style={{
                              shadowColor: colors.primary,
                              shadowOffset: { width: 0, height: 4 },
                              shadowOpacity: 0.18,
                              shadowRadius: 10,
                              elevation: 3,
                            }}
                          >
                            <View className="flex-1 p-md justify-between gap-xs">
                              <View className="gap-xs">
                                <View className="self-start px-sm py-xs rounded-sm bg-mint-surface">
                                  <Text className="font-label text-label-sm text-on-mint-surface">
                                    {slide.tag}
                                  </Text>
                                </View>
                                <Text
                                  className="font-headline text-title-lg text-on-primary text-right"
                                  numberOfLines={1}
                                >
                                  {slide.title}
                                </Text>
                                <Text
                                  className="font-body text-body-sm text-on-primary text-right"
                                  numberOfLines={2}
                                >
                                  {slide.subtitle}
                                </Text>
                              </View>
                              <Pressable
                                onPress={() => handleOpenSlide(slide)}
                                className="self-start px-md py-xs rounded-md bg-mint-surface active:bg-soft-accent"
                              >
                                <Text className="font-label text-label-md text-on-mint-surface">
                                  {slide.ctaLabel}
                                </Text>
                              </Pressable>
                            </View>

                            <View className="w-32 h-[152px] bg-mint-surface">
                              <Image
                                source={getLocalImage(slide.imageKey)}
                                contentFit="cover"
                                style={{ width: 128, height: 152 }}
                                accessibilityLabel={slide.title}
                              />
                            </View>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => handleOpenSlide(slide)}
                            className="bg-mint-surface border border-outline rounded-lg overflow-hidden flex-row items-stretch h-[152px]"
                          >
                            <View className="flex-1 p-md justify-between gap-xs">
                              <View className="gap-xs">
                                <View className="self-start px-sm py-xs rounded-sm bg-primary">
                                  <Text className="font-label text-label-sm text-on-primary">
                                    {slide.tag}
                                  </Text>
                                </View>
                                <Text
                                  className="font-headline text-title-lg text-on-mint-surface text-right"
                                  numberOfLines={1}
                                >
                                  {slide.title}
                                </Text>
                                <Text
                                  className="font-body text-body-sm text-on-surface-muted text-right"
                                  numberOfLines={2}
                                >
                                  {slide.subtitle}
                                </Text>
                              </View>
                              <Text className="font-label text-label-md text-primary text-right">
                                {slide.ctaLabel}
                              </Text>
                            </View>

                            <View className="w-32 h-[152px] bg-surface-card">
                              <Image
                                source={getLocalImage(slide.imageKey)}
                                contentFit="cover"
                                style={{ width: 128, height: 152 }}
                                accessibilityLabel={slide.title}
                              />
                            </View>
                          </Pressable>
                        )}
                      </View>
                    );
                  }}
                />

                {promoSlides.length > 1 ? (
                  <View className="flex-row items-center justify-center gap-xs pt-xs">
                    {promoSlides.map((slide, idx) => (
                      <Pressable
                        key={slide.id}
                        onPress={() => handleSelectSlideDot(idx)}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={`${slide.title} (${idx + 1})`}
                      >
                        <PaginationDot active={idx === activeSlideIndex % promoSlides.length} />
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Categories Strip */}
            <View className="gap-md">
              <View className="flex-row items-center justify-between">
                <Text className="font-headline text-title-lg text-on-surface">
                  {STRINGS.home.categoriesTitle}
                </Text>
                <Pressable onPress={() => router.push('/(user)/(tabs)/categories')}>
                  <Text className="font-label text-label-md text-primary">
                    {STRINGS.common.viewAll}
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-md"
              >
                {categories
                  .filter((c) => c.isActive)
                  .map((category) => (
                    <Pressable
                      key={category.id}
                      onPress={() =>
                        router.push({
                          pathname: '/(user)/(tabs)/categories',
                          params: { categoryId: category.id },
                        })
                      }
                      className="w-[76px] items-center gap-xs"
                    >
                      <View className="w-16 h-16 rounded-lg bg-mint-surface border border-outline p-xs overflow-hidden">
                        <Image
                          source={getLocalImage(category.imageKey)}
                          contentFit="cover"
                          style={{ width: '100%', height: '100%', borderRadius: 10 }}
                          accessibilityLabel={category.name}
                        />
                      </View>
                      <Text
                        className="font-label text-label-sm text-on-surface text-center"
                        numberOfLines={1}
                      >
                        {category.name}
                      </Text>
                    </Pressable>
                  ))}
              </ScrollView>
            </View>

            {/* Products Sections */}
            {isLoading ? (
              <ListSkeleton count={3} />
            ) : isError ? (
              <ErrorState onRetry={refetch} />
            ) : (
              <>
                <View className="gap-md">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-headline text-title-lg text-on-surface">
                      {STRINGS.home.dailyOffersTitle}
                    </Text>
                    <Pressable onPress={() => router.push('/(user)/(tabs)/categories')}>
                      <Text className="font-label text-label-md text-primary">
                        {STRINGS.common.more}
                      </Text>
                    </Pressable>
                  </View>
                  <ProductTwoColumnGrid items={dailyOffers} />
                </View>

                <View className="gap-md">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-headline text-title-lg text-on-surface">
                      {STRINGS.home.bestSellersTitle}
                    </Text>
                    <Pressable onPress={() => router.push('/(user)/(tabs)/categories')}>
                      <Text className="font-label text-label-md text-primary">
                        {STRINGS.common.more}
                      </Text>
                    </Pressable>
                  </View>
                  <ProductTwoColumnGrid items={bestSellers} />
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <AddressPickerModal
        visible={addressModalOpen}
        addresses={addresses}
        onClose={() => setAddressModalOpen(false)}
        onSelectAddress={setDefaultAddress}
      />

      <NotificationsModal
        visible={notifModalOpen}
        notifications={notifications}
        onClose={() => setNotifModalOpen(false)}
        onMarkAllRead={() => markAllRead()}
      />
    </SafeAreaView>
  );
}
