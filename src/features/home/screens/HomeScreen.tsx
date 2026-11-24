import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Bell, ChevronDown, MapPin, QrCode, Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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
  useMarkAllNotificationsRead,
  useNotifications,
  useSetDefaultAddress,
} from '@/features/profile/hooks/useProfile';
import { formatNumber } from '@/lib/format';
import { getLocalImage } from '@/lib/images';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';
import type { Product } from '@/types/domain';

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
  const [search, setSearch] = useState('');
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);

  const showToast = useUiStore((s) => s.showToast);

  const { data: categories = [] } = useCategories();
  const {
    data: products = [],
    isLoading,
    isError,
    refetch,
  } = useProducts(search.trim() ? { search: search.trim() } : {});
  const { data: addresses = [] } = useAddresses();
  const { mutate: setDefaultAddress } = useSetDefaultAddress();
  const { data: notifications = [] } = useNotifications();
  const { mutate: markAllRead } = useMarkAllNotificationsRead();

  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const dailyOffers = products.filter((p) => p.isDailyOffer);
  const bestSellers = products.filter((p) => p.isBestSeller);

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
          ) : (
            <Pressable
              onPress={() => showToast(STRINGS.home.scannerNotice)}
              hitSlop={8}
              accessibilityLabel={STRINGS.home.scanBarcodeLabel}
              className="w-8 h-8 rounded-sm bg-mint-surface items-center justify-center active:bg-soft-accent"
            >
              <QrCode size={18} color={colors.primary} />
            </Pressable>
          )}
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
            {/* Promo Banner Carousel */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-md"
            >
              <View
                className="w-[330px] bg-primary rounded-lg overflow-hidden flex-row items-stretch"
                style={{
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.18,
                  shadowRadius: 10,
                  elevation: 3,
                }}
              >
                <View className="flex-1 p-base justify-between gap-sm">
                  <View className="gap-xs">
                    <View className="self-start px-sm py-xs rounded-sm bg-mint-surface">
                      <Text className="font-label text-label-sm text-on-mint-surface">
                        {STRINGS.home.promoExclusiveTag}
                      </Text>
                    </View>
                    <Text className="font-headline text-headline-md text-on-primary text-right">
                      {STRINGS.home.promoExclusiveTitle}
                    </Text>
                    <Text className="font-body text-body-sm text-on-primary text-right">
                      {STRINGS.home.promoExclusiveDesc}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => router.push('/(user)/(tabs)/categories')}
                    className="self-start px-md py-xs rounded-md bg-mint-surface active:bg-soft-accent"
                  >
                    <Text className="font-label text-label-md text-on-mint-surface">
                      {STRINGS.home.promoExclusiveCta}
                    </Text>
                  </Pressable>
                </View>

                <View className="w-32 bg-mint-surface">
                  <Image
                    source={getLocalImage('promo-basket')}
                    contentFit="cover"
                    style={{ width: '100%', height: '100%' }}
                    accessibilityLabel={STRINGS.home.promoExclusiveTitle}
                  />
                </View>
              </View>

              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(user)/(tabs)/categories',
                    params: { categoryId: 'cat-2' },
                  })
                }
                className="w-[290px] bg-mint-surface border border-outline rounded-lg p-base justify-between gap-sm"
              >
                <View className="gap-xs">
                  <View className="self-start px-sm py-xs rounded-sm bg-primary">
                    <Text className="font-label text-label-sm text-on-primary">
                      {STRINGS.home.promoBreakfastTag}
                    </Text>
                  </View>
                  <Text className="font-headline text-headline-md text-on-mint-surface text-right">
                    {STRINGS.home.promoBreakfastTitle}
                  </Text>
                  <Text className="font-body text-body-sm text-on-surface-muted text-right">
                    {STRINGS.home.promoBreakfastDesc}
                  </Text>
                </View>
                <Text className="font-label text-label-md text-primary text-right">
                  {STRINGS.home.promoBreakfastCta}
                </Text>
              </Pressable>
            </ScrollView>

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
