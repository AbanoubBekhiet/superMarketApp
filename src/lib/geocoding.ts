import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface ResolvedGeoAddress {
  formattedAddress: string;
  area: string;
  city: string;
  street: string;
}

const geoCache = new Map<string, ResolvedGeoAddress>();

function buildCacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}

function dedupeParts(parts: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const clean = part?.trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

/**
 * Formats latitude and longitude as a concise LTR display string.
 */
export function formatLatLngCoords(
  latitude?: number | null,
  longitude?: number | null,
): string | null {
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

async function resolveWithNominatim(
  latitude: number,
  longitude: number,
): Promise<ResolvedGeoAddress | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      String(latitude),
    )}&lon=${encodeURIComponent(String(longitude))}&accept-language=ar`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'TazagSupermarketApp/1.0',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      display_name?: string;
      address?: {
        road?: string;
        pedestrian?: string;
        neighbourhood?: string;
        suburb?: string;
        city_district?: string;
        city?: string;
        town?: string;
        village?: string;
        state?: string;
      };
    };
    const addr = data.address;
    const street = addr?.road || addr?.pedestrian || addr?.neighbourhood || '';
    const area =
      addr?.suburb || addr?.city_district || addr?.neighbourhood || addr?.town || addr?.village || '';
    const city = addr?.city || addr?.town || addr?.state || '';
    const parts = dedupeParts([street, area, city, addr?.state]);
    const formattedAddress = parts.join('، ') || data.display_name?.trim() || '';
    if (!formattedAddress) return null;
    return {
      formattedAddress,
      area: area || city || 'الإسكندرية',
      city: city || 'الإسكندرية',
      street: street || area || formattedAddress,
    };
  } catch {
    return null;
  }
}

/**
 * Reverse-geocodes coordinates into a readable address string and structured parts.
 */
export async function reverseGeocodeCoords(
  latitude: number,
  longitude: number,
): Promise<ResolvedGeoAddress | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const cacheKey = buildCacheKey(latitude, longitude);
  const cached = geoCache.get(cacheKey);
  if (cached) return cached;

  if (Platform.OS !== 'web') {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      const first = results[0];
      if (first) {
        const street = first.street || first.name || '';
        const area = first.district || first.subregion || first.city || '';
        const city = first.city || first.region || '';
        const parts = dedupeParts([
          first.streetNumber && first.street
            ? `${first.streetNumber} ${first.street}`
            : street,
          first.district,
          first.city,
          first.region,
        ]);
        const formattedAddress = parts.join('، ');
        if (formattedAddress) {
          const resolved: ResolvedGeoAddress = {
            formattedAddress,
            area: area || 'الإسكندرية',
            city: city || 'الإسكندرية',
            street: street || area || formattedAddress,
          };
          geoCache.set(cacheKey, resolved);
          return resolved;
        }
      }
    } catch {
      // Fallback to Nominatim below
    }
  }

  const nominatim = await resolveWithNominatim(latitude, longitude);
  if (nominatim) {
    geoCache.set(cacheKey, nominatim);
  }
  return nominatim;
}

/**
 * React Query hook that resolves customer coordinates into a human-readable address,
 * falling back cleanly to stored text or formatted coordinates.
 */
export function useResolvedGeoAddress(params: {
  latitude?: number | null;
  longitude?: number | null;
  fallback?: string | null;
}) {
  const { latitude, longitude, fallback } = params;
  const coordsText = formatLatLngCoords(latitude, longitude);
  const hasCoords = latitude != null && longitude != null && coordsText !== null;

  const query = useQuery({
    queryKey: ['reverse-geocode', coordsText ?? 'none'],
    queryFn: () => reverseGeocodeCoords(latitude!, longitude!),
    enabled: hasCoords,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });

  const resolvedText = query.data?.formattedAddress?.trim();
  const cleanFallback = fallback?.trim();

  return {
    address: resolvedText || cleanFallback || coordsText || 'غير محدد',
    resolvedGeo: query.data ?? null,
    coordsText,
    isResolving: hasCoords && query.isLoading,
  };
}
