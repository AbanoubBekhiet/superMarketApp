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
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/StateViews';
import { STRINGS } from '@/constants/strings';
import { useProducts } from '@/features/products/hooks/useProducts';
import {
  useAddAddress,
  useAddresses,
  useNotifications,
  useSetDefaultAddress,
} from '@/features/profile/hooks/useProfile';
import { formatCurrency } from '@/lib/format';
import { getLocalImage } from '@/lib/images';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';

type ActiveModal = null | 'edit' | 'addresses' | 'favorites' | 'notifications';

export function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const signOut = useAuthStore((s) => s.signOut);
  const favoriteIds = useCartStore((s) => s.favoriteIds);
  const showToast = useUiStore((s) => s.showToast);

  const { data: addresses = [] } = useAddresses();
  const { mutateAsync: addAddress } = useAddAddress();
  const { mutate: setDefaultAddress } = useSetDefaultAddress();
  const { data: products = [] } = useProducts();
  const { data: notifications = [] } = useNotifications();

  const [modal, setModal] = useState<ActiveModal>(null);
  const [editName, setEditName] = useState(user?.name ?? 'أحمد المنصوري');
  const [editPhone, setEditPhone] = useState(user?.phone ?? '+20 102 458 9120');

  const [addrLabel, setAddrLabel] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrArea, setAddrArea] = useState('');

  const favoriteProducts = products.filter((p) => favoriteIds.includes(p.id));

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    await updateUser({ name: editName.trim(), phone: editPhone.trim() });
    showToast(STRINGS.profile.updatedSuccess);
    setModal(null);
  };

  const handleAddAddress = async () => {
    if (!addrLabel.trim() || !addrStreet.trim() || !addrArea.trim()) return;
    await addAddress({
      label: addrLabel.trim(),
      street: addrStreet.trim(),
      area: addrArea.trim(),
      city: 'الإسكندرية',
      isDefault: true,
    });
    setAddrLabel('');
    setAddrStreet('');
    setAddrArea('');
    showToast(STRINGS.profile.updatedSuccess);
  };

  const handleLogout = async () => {
    await signOut();
    showToast(STRINGS.auth.logoutSuccess);
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
      subtitle: STRINGS.profile.supportSubtitle,
      Icon: Headset,
      onPress: () => showToast(STRINGS.profile.supportNotice),
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

      {/* Contextual Modals */}
      <Modal
        visible={modal !== null}
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
                  : modal === 'addresses'
                    ? STRINGS.profile.savedAddresses
                    : modal === 'favorites'
                      ? STRINGS.profile.favorites
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

            {modal === 'addresses' ? (
              <ScrollView contentContainerClassName="gap-md">
                {addresses.map((addr) => (
                  <Pressable
                    key={addr.id}
                    onPress={() => setDefaultAddress(addr.id)}
                    className={`p-md rounded-lg border ${
                      addr.isDefault
                        ? 'bg-mint-surface border-primary'
                        : 'bg-surface border-outline-subtle'
                    }`}
                  >
                    <Text className="font-title text-title-sm text-on-surface text-right">
                      {addr.label} — {addr.area}
                    </Text>
                    <Text className="font-body text-body-sm text-on-surface-muted text-right">
                      {addr.street}، {addr.city}
                    </Text>
                  </Pressable>
                ))}
                <View className="pt-sm border-t border-outline-subtle gap-sm">
                  <Text className="font-title text-title-sm text-on-surface text-right">
                    {STRINGS.profile.addAddressTitle}
                  </Text>
                  <Input
                    placeholder={STRINGS.profile.addressLabelPlaceholder}
                    value={addrLabel}
                    onChangeText={setAddrLabel}
                  />
                  <Input
                    placeholder={STRINGS.profile.addressStreetPlaceholder}
                    value={addrStreet}
                    onChangeText={setAddrStreet}
                  />
                  <Input
                    placeholder={STRINGS.profile.addressAreaPlaceholder}
                    value={addrArea}
                    onChangeText={setAddrArea}
                  />
                  <Button
                    variant="mint-outline"
                    label={STRINGS.common.save}
                    onPress={handleAddAddress}
                  />
                </View>
              </ScrollView>
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
              <ScrollView contentContainerClassName="gap-sm">
                {notifications.map((n) => (
                  <View
                    key={n.id}
                    className="p-md rounded-lg border border-outline-subtle bg-surface gap-xs"
                  >
                    <Text className="font-title text-title-sm text-on-surface text-right">
                      {n.title}
                    </Text>
                    <Text className="font-body text-body-sm text-on-surface-muted text-right">
                      {n.body}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
