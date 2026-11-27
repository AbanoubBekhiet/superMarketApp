import * as Location from 'expo-location';
import { LocateFixed, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { STRINGS } from '@/constants/strings';
import { useAddAddress } from '@/features/profile/hooks/useProfile';
import { reverseGeocodeCoords, useResolvedGeoAddress } from '@/lib/geocoding';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';
import type { Address } from '@/types/domain';

interface AddressPickerModalProps {
  visible: boolean;
  addresses: Address[];
  onClose: () => void;
  onSelectAddress?: (addressId: string) => void;
}

/**
 * Shared bottom-sheet modal allowing each customer to view and update their single delivery address.
 */
export function AddressPickerModal({
  visible,
  addresses,
  onClose,
  onSelectAddress,
}: AddressPickerModalProps) {
  const showToast = useUiStore((s) => s.showToast);
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const { mutateAsync: saveAddress, isPending } = useAddAddress();
  const primaryAddress = addresses.find((a) => a.isDefault) ?? addresses[0];

  const [draftLabel, setDraftLabel] = useState<string | null>(null);
  const [draftStreet, setDraftStreet] = useState<string | null>(null);
  const [draftArea, setDraftArea] = useState<string | null>(null);
  const [draftCoords, setDraftCoords] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );
  const [locating, setLocating] = useState(false);

  const activeLat = draftCoords?.latitude ?? primaryAddress?.latitude ?? user?.latitude ?? null;
  const activeLng = draftCoords?.longitude ?? primaryAddress?.longitude ?? user?.longitude ?? null;
  const fallbackPrimaryText = primaryAddress
    ? `${primaryAddress.street}، ${primaryAddress.city}`
    : '';

  const { address: resolvedAddress, coordsText } = useResolvedGeoAddress({
    latitude: activeLat,
    longitude: activeLng,
    fallback: fallbackPrimaryText,
  });

  const label = draftLabel ?? primaryAddress?.label ?? '';
  const street = draftStreet ?? primaryAddress?.street ?? '';
  const area = draftArea ?? primaryAddress?.area ?? '';

  const handleClose = () => {
    setDraftLabel(null);
    setDraftStreet(null);
    setDraftArea(null);
    setDraftCoords(null);
    onClose();
  };

  const handleDetectGps = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast(STRINGS.auth.locationPermissionDenied, 'error');
        return;
      }
      let position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).catch(() => null);
      if (!position) {
        position = await Location.getLastKnownPositionAsync().catch(() => null);
      }
      if (!position) {
        showToast(STRINGS.auth.locationFailed, 'error');
        return;
      }
      const { latitude, longitude } = position.coords;
      setDraftCoords({ latitude, longitude });
      const geo = await reverseGeocodeCoords(latitude, longitude);
      if (geo) {
        if (!draftLabel?.trim() && !primaryAddress?.label) {
          setDraftLabel('موقعي الحالي');
        }
        setDraftStreet(geo.street);
        setDraftArea(geo.area);
      }
      showToast(STRINGS.auth.locationDetected);
    } catch {
      showToast(STRINGS.auth.locationFailed, 'error');
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    if (!label.trim() || !street.trim() || !area.trim()) {
      showToast(STRINGS.common.requiredField, 'error');
      return;
    }
    try {
      const saved = await saveAddress({
        label: label.trim(),
        street: street.trim(),
        area: area.trim(),
        city: primaryAddress?.city || 'الإسكندرية',
        latitude: activeLat,
        longitude: activeLng,
        isDefault: true,
      });
      if (activeLat != null && activeLng != null) {
        await updateUser({ area: area.trim(), latitude: activeLat, longitude: activeLng }).catch(
          () => undefined,
        );
      }
      onSelectAddress?.(saved.id);
      showToast(STRINGS.profile.updatedSuccess);
      handleClose();
    } catch {
      showToast(STRINGS.common.errorMessage, 'error');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable className="flex-1 bg-on-surface/40 justify-end" onPress={handleClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-surface-card rounded-t-xl p-lg gap-md border-t border-outline-subtle"
        >
          <View className="flex-row items-center justify-between pb-sm border-b border-outline-subtle">
            <Text className="font-headline text-title-lg text-on-surface">
              {STRINGS.home.chooseAddressTitle}
            </Text>
            <Pressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.common.close}
              hitSlop={8}
            >
              <X size={20} color={colors.onSurfaceMuted} />
            </Pressable>
          </View>

          {primaryAddress || coordsText ? (
            <View className="p-md rounded-lg border bg-mint-surface border-primary gap-xs">
              {primaryAddress ? (
                <Text className="font-title text-title-sm text-on-surface text-right">
                  {primaryAddress.label} — {primaryAddress.area}
                </Text>
              ) : null}
              <Text className="font-body text-body-sm text-on-surface-muted text-right">
                {resolvedAddress}
              </Text>
              {coordsText ? (
                <Text
                  className="font-body text-body-sm text-primary text-right"
                  style={{ writingDirection: 'ltr', fontVariant: ['tabular-nums'] }}
                >
                  {coordsText}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View className="gap-sm">
            <Button
              variant="mint-outline"
              size="sm"
              isLoading={locating}
              onPress={handleDetectGps}
            >
              <LocateFixed size={15} color={colors.primary} />
              <Text className="font-label-bold text-label-md text-primary">
                {locating ? STRINGS.auth.detectingLocation : STRINGS.auth.detectLocationBtn}
              </Text>
            </Button>
            <Input
              placeholder={STRINGS.profile.addressLabelPlaceholder}
              value={label}
              onChangeText={setDraftLabel}
            />
            <Input
              placeholder={STRINGS.profile.addressStreetPlaceholder}
              value={street}
              onChangeText={setDraftStreet}
            />
            <Input
              placeholder={STRINGS.profile.addressAreaPlaceholder}
              value={area}
              onChangeText={setDraftArea}
            />
            <Button
              variant="primary"
              size="lg"
              isLoading={isPending}
              label={STRINGS.common.save}
              onPress={handleSave}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
