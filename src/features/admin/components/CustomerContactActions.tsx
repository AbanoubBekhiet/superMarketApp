import { MapPin, MessageCircle, Phone } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { STRINGS } from '@/constants/strings';
import {
  callPhoneNumber,
  hasCallablePhone,
  openMapLocation,
  openWhatsappChat,
} from '@/lib/contact';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';

interface CustomerContactActionsProps {
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  addressText?: string | null;
}

/**
 * Displays customer phone & address with quick WhatsApp, Phone Call, and Map Location actions.
 */
export function CustomerContactActions({
  phone,
  latitude,
  longitude,
  addressText,
}: CustomerContactActionsProps) {
  const showToast = useUiStore((s) => s.showToast);
  const phoneAvailable = hasCallablePhone(phone);

  const handleCall = () =>
    callPhoneNumber(phone, () => showToast(STRINGS.admin.phoneUnavailable, 'error'));

  const handleWhatsapp = () =>
    openWhatsappChat(phone, () => showToast(STRINGS.admin.phoneUnavailable, 'error'));

  const handleLocation = () =>
    openMapLocation(
      { latitude, longitude, addressText },
      () => showToast(STRINGS.admin.locationUnavailable, 'error'),
    );

  return (
    <View className="mt-xs p-sm rounded-lg bg-surface border border-outline-subtle gap-sm">
      {phoneAvailable ? (
        <Text
          className="font-headline text-title-sm text-on-surface text-right"
          style={{ writingDirection: 'ltr', fontVariant: ['tabular-nums'] }}
        >
          {phone}
        </Text>
      ) : null}

      <View className="flex-row items-center gap-xs">
        <Pressable
          onPress={handleWhatsapp}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.admin.whatsappCustomerBtn}
          className="flex-1 flex-row items-center justify-center gap-xs py-sm px-xs rounded-md bg-mint-surface border border-outline active:opacity-85"
        >
          <MessageCircle size={15} color={colors.primary} />
          <Text className="font-label-bold text-label-sm text-primary">
            {STRINGS.admin.whatsappCustomerBtn}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleCall}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.admin.callCustomerBtn}
          className="flex-1 flex-row items-center justify-center gap-xs py-sm px-xs rounded-md bg-primary active:opacity-85"
        >
          <Phone size={15} color={colors.onPrimary} />
          <Text className="font-label-bold text-label-sm text-on-primary">
            {STRINGS.admin.callCustomerBtn}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleLocation}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.admin.locationBtn}
          className="flex-1 flex-row items-center justify-center gap-xs py-sm px-xs rounded-md bg-surface-card border border-outline-subtle active:bg-mint-surface"
        >
          <MapPin size={15} color={colors.primary} />
          <Text className="font-label-bold text-label-sm text-on-surface">
            {STRINGS.admin.locationBtn}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
