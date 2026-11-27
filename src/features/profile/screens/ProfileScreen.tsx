import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  BadgeCheck,
  Bell,
  ChevronLeft,
  Headset,
  Heart,
  LogOut,
  MapPin,
  MessageCircle,
  Phone,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/StateViews';
import { STRINGS } from '@/constants/strings';
import { useProducts } from '@/features/products/hooks/useProducts';
import { updateProfileInfo } from '@/features/profile/api/profileApi';
import { AddressPickerModal } from '@/features/profile/components/AddressPickerModal';
import { NotificationCardItem } from '@/features/profile/components/NotificationCardItem';
import {
  useAddresses,
  useAppSettings,
  useFavoriteIds,
  useNotifications,
} from '@/features/profile/hooks/useProfile';
import { formatCurrency } from '@/lib/format';
import { getLocalImage } from '@/lib/images';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';

type ActiveModal = null | 'edit' | 'addresses' | 'favorites' | 'notifications' | 'support';

function formatWhatsappDigits(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('01') && digits.length === 11) {
    return `2${digits}`;
  }
  if (digits.startsWith('00')) {
    return digits.slice(2);
  }
  return digits;
}

export function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const signOut = useAuthStore((s) => s.signOut);
  const localFavIds = useCartStore((s) => s.favoriteIds);
  const { data: remoteFavIds = [], isSuccess: favsLoaded } = useFavoriteIds();
  const favoriteIds = favsLoaded ? remoteFavIds : localFavIds;
  const { data: settings = [] } = useAppSettings();
  const showToast = useUiStore((s) => s.showToast);

  const { data: addresses = [] } = useAddresses();
  const { data: products = [] } = useProducts();
  const { data: notifications = [] } = useNotifications();

  const [modal, setModal] = useState<ActiveModal>(null);
  const [editName, setEditName] = useState(user?.name ?? '');
  const [editPhone, setEditPhone] = useState(user?.phone ?? '');

  const favoriteProducts = products.filter((p) => favoriteIds.includes(p.id));
  const supportPhone =
    settings.find((s) => s.key === 'support_phone')?.value ?? '+20 102 458 9120';

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    await updateProfileInfo({
      fullName: editName.trim(),
      phone: editPhone.trim() || undefined,
    });
    await updateUser({ name: editName.trim(), phone: editPhone.trim() });
    showToast(STRINGS.profile.updatedSuccess);
    setModal(null);
  };

  const handleLogout = async () => {
    await signOut();
    showToast(STRINGS.auth.logoutSuccess);
  };

  const handleCallSupport = async () => {
    const cleanTel = supportPhone.replace(/\s+/g, '');
    if (!cleanTel) {
      showToast(STRINGS.profile.supportUnavailable, 'error');
      return;
    }
    try {
      await Linking.openURL(`tel:${cleanTel}`);
    } catch {
      showToast(STRINGS.profile.supportUnavailable, 'error');
    }
  };

  const handleWhatsappSupport = async () => {
    const waDigits = formatWhatsappDigits(supportPhone);
    if (!waDigits) {
      showToast(STRINGS.profile.supportUnavailable, 'error');
      return;
    }
    try {
      await Linking.openURL(`https://wa.me/${waDigits}`);
    } catch {
      showToast(STRINGS.profile.supportUnavailable, 'error');
    }
  };

  const menuRows = [
    {
      key: 'personal',
      title: STRINGS.profile.personalInfo,
      Icon: BadgeCheck,
      onPress: () => {
        setEditName(user?.name ?? 'أحمد المنصوري');
        setEditPhone(user?.phone ?? '+20 102 458 9120');
        setModal('edit');
      },
    },
    {
      key: 'addresses',
      title: STRINGS.profile.savedAddresses,
      Icon: MapPin,
      onPress: () => setModal('addresses'),
    },
    {
      key: 'favorites',
      title: STRINGS.profile.favorites,
      Icon: Heart,
      onPress: () => setModal('favorites'),
    },
    {
      key: 'notifications',
      title: STRINGS.profile.notificationsOffers,
      Icon: Bell,
      onPress: () => setModal('notifications'),
    },
    {
      key: 'support',
      title: STRINGS.profile.supportTitle,
      subtitle: supportPhone,
      Icon: Headset,
      onPress: () => setModal('support'),
    },
  ] as const;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <ScreenHeader title={STRINGS.profile.title} />

      <ScrollView
        contentContainerClassName="px-page-x pt-base pb-xl gap-section"
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <Card className="flex-row items-center justify-between gap-md">
          <View className="flex-row items-center gap-md flex-1 min-w-0">
            <Image
              source={getLocalImage(user?.avatarKey ?? 'avatar-ahmed')}
              contentFit="cover"
              style={{
                width: 64,
                height: 64,
                borderRadius: 9999,
                borderWidth: 2,
                borderColor: colors.mintSurface,
              }}
              accessibilityLabel={user?.name ?? 'أحمد المنصوري'}
            />
            <View className="flex-1 min-w-0 gap-xs">
              <Text className="font-headline text-title-lg text-on-surface text-right" numberOfLines={1}>
                {user?.name ?? 'أحمد المنصوري'}
              </Text>
              <Text
                className="font-body text-body-md text-on-surface-muted text-right"
                style={{ writingDirection: 'ltr', fontVariant: ['tabular-nums'] }}
              >
                {user?.phone ?? '+20 102 458 9120'}
              </Text>
            </View>
          </View>

          <Button
            variant="mint"
            size="sm"
            label={STRINGS.profile.editButton}
            onPress={() => {
              setEditName(user?.name ?? 'أحمد المنصوري');
              setEditPhone(user?.phone ?? '+20 102 458 9120');
              setModal('edit');
            }}
          />
        </Card>

        {/* Account Menu Group */}
        <Card padded={false} className="overflow-hidden">
          {menuRows.map((row, idx) => {
            const Icon = row.Icon;
            return (
              <Pressable
                key={row.key}
                onPress={row.onPress}
                className={`flex-row items-center justify-between gap-md px-base py-md active:bg-surface ${
                  idx < menuRows.length - 1 ? 'border-b border-outline-subtle' : ''
                }`}
              >
                <View className="flex-row items-center gap-md flex-1">
                  <View className="w-9 h-9 rounded-md bg-mint-surface items-center justify-center shrink-0">
                    <Icon size={20} color={colors.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-title text-title-sm text-on-surface text-right">
                      {row.title}
                    </Text>
                    {'subtitle' in row && row.subtitle ? (
                      <Text className="font-body text-body-sm text-primary text-right">
                        {row.subtitle}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <ChevronLeft size={20} color={colors.onSurfaceSubtle} />
              </Pressable>
            );
          })}
        </Card>

        {/* Logout */}
        <Button variant="danger" size="lg" onPress={handleLogout}>
          <LogOut size={20} color={colors.error} />
          <Text className="font-label-bold text-label-lg text-error">
            {STRINGS.profile.logout}
          </Text>
        </Button>
      </ScrollView>

      {/* Single Address Edit Modal */}
      <AddressPickerModal
        visible={modal === 'addresses'}
        addresses={addresses}
        onClose={() => setModal(null)}
      />

      {/* Contextual Modals */}
      <Modal
        visible={modal !== null && modal !== 'addresses'}
        transparent
        animationType="fade"
        onRequestClose={() => setModal(null)}
      >
        <Pressable
          className="flex-1 bg-on-surface/40 justify-end"
          onPress={() => setModal(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-surface-card rounded-t-xl p-lg gap-md border-t border-outline-subtle max-h-[80%]"
          >
            <View className="flex-row items-center justify-between pb-sm border-b border-outline-subtle">
              <Text className="font-headline text-title-lg text-on-surface">
                {modal === 'edit'
                  ? STRINGS.profile.editProfileTitle
                  : modal === 'favorites'
                    ? STRINGS.profile.favorites
                    : modal === 'support'
                      ? STRINGS.profile.supportModalTitle
                      : STRINGS.profile.notificationsOffers}
              </Text>
              <Pressable onPress={() => setModal(null)} hitSlop={8}>
                <X size={20} color={colors.onSurfaceMuted} />
              </Pressable>
            </View>

            {modal === 'edit' ? (
              <View className="gap-md">
                <Input
                  label={STRINGS.auth.nameLabel}
                  value={editName}
                  onChangeText={setEditName}
                />
                <Input
                  label={STRINGS.auth.phoneLabel}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                />
                <Button
                  variant="primary"
                  size="lg"
                  label={STRINGS.common.save}
                  onPress={handleSaveProfile}
                />
              </View>
            ) : null}

            {modal === 'favorites' ? (
              <ScrollView contentContainerClassName="gap-sm">
                {favoriteProducts.length === 0 ? (
                  <EmptyState title={STRINGS.profile.noFavorites} />
                ) : (
                  favoriteProducts.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        setModal(null);
                        router.push({
                          pathname: '/(user)/product/[id]',
                          params: { id: item.id },
                        });
                      }}
                      className="flex-row items-center gap-md p-sm rounded-lg border border-outline-subtle bg-surface"
                    >
                      <Image
                        source={getLocalImage(item.imageKey)}
                        contentFit="cover"
                        style={{ width: 52, height: 52, borderRadius: 10 }}
                      />
                      <View className="flex-1">
                        <Text className="font-title text-title-sm text-on-surface text-right">
                          {item.name}
                        </Text>
                        <Text className="font-headline text-body-md text-primary text-right">
                          {formatCurrency(item.price)}
                        </Text>
                      </View>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            ) : null}

            {modal === 'notifications' ? (
              <ScrollView contentContainerClassName="gap-sm pb-sm" showsVerticalScrollIndicator={false}>
                {notifications.length === 0 ? (
                  <EmptyState title={STRINGS.common.noNotifications} />
                ) : (
                  notifications.map((n) => <NotificationCardItem key={n.id} notification={n} />)
                )}
              </ScrollView>
            ) : null}

            {modal === 'support' ? (
              <View className="gap-md">
                <View className="p-md rounded-lg bg-surface border border-outline-subtle gap-xs items-center">
                  <Text className="font-body text-body-md text-on-surface-muted text-center">
                    {STRINGS.profile.supportModalSubtitle}
                  </Text>
                  <Text
                    className="font-headline text-title-lg text-primary"
                    style={{ writingDirection: 'ltr', fontVariant: ['tabular-nums'] }}
                  >
                    {supportPhone}
                  </Text>
                </View>

                <Button variant="primary" size="lg" onPress={handleCallSupport}>
                  <Phone size={18} color={colors.onPrimary} />
                  <Text className="font-label-bold text-label-lg text-on-primary">
                    {STRINGS.profile.supportCallPhone}
                  </Text>
                </Button>

                <Button variant="mint-outline" size="lg" onPress={handleWhatsappSupport}>
                  <MessageCircle size={18} color={colors.primary} />
                  <Text className="font-label-bold text-label-lg text-primary">
                    {STRINGS.profile.supportWhatsapp}
                  </Text>
                </Button>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
