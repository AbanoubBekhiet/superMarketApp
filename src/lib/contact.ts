import { Linking } from 'react-native';

/**
 * Normalizes an Egyptian or international phone number into WhatsApp digits (`201...`).
 */
export function formatWhatsappDigits(rawPhone: string): string {
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

export function hasCallablePhone(phone?: string | null): boolean {
  const clean = (phone ?? '').replace(/\s+/g, '');
  return Boolean(clean && clean !== 'غير مسجل');
}

/**
 * Opens the device phone dialer for the given phone number.
 */
export async function callPhoneNumber(
  phone?: string | null,
  onUnavailable?: () => void,
): Promise<void> {
  const clean = (phone ?? '').replace(/\s+/g, '');
  if (!clean || clean === 'غير مسجل') {
    onUnavailable?.();
    return;
  }
  await Linking.openURL(`tel:${clean}`).catch(() => {
    onUnavailable?.();
  });
}

/**
 * Opens a WhatsApp chat for the given phone number.
 */
export async function openWhatsappChat(
  phone?: string | null,
  onUnavailable?: () => void,
): Promise<void> {
  const waDigits = formatWhatsappDigits(phone ?? '');
  if (!waDigits) {
    onUnavailable?.();
    return;
  }
  await Linking.openURL(`https://wa.me/${waDigits}`).catch(() => {
    onUnavailable?.();
  });
}

/**
 * Opens Google Maps at exact coordinates or falls back to an address search query.
 */
export async function openMapLocation(
  params: {
    latitude?: number | null;
    longitude?: number | null;
    addressText?: string | null;
  },
  onUnavailable?: () => void,
): Promise<void> {
  if (params.latitude != null && params.longitude != null) {
    await Linking.openURL(
      `https://www.google.com/maps?q=${params.latitude},${params.longitude}`,
    ).catch(() => {
      onUnavailable?.();
    });
    return;
  }
  const cleanQuery = params.addressText?.trim();
  if (cleanQuery) {
    await Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanQuery)}`,
    ).catch(() => {
      onUnavailable?.();
    });
    return;
  }
  onUnavailable?.();
}
