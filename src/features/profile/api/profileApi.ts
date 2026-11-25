import {
  addMyFavorite,
  adminListStaffNotifications,
  clearOtherDefaultAddresses,
  createMyAddress,
  createMyVehicle,
  getMyProfile,
  listActiveBanners,
  listAppSettings,
  listMyAddresses,
  listMyFavorites,
  listMyNotifications,
  listMyVehicles,
  markAllMyNotificationsRead,
  removeMyFavorite,
  setDefaultMyAddress,
  setDefaultMyVehicle,
  softDeleteMyVehicle,
  updateMyProfile,
  validateCouponCode,
} from '@/dataconnect-generated';
import { dataConnect } from '@/services/firebase/app';
import { mapAddress, mapNotification } from '@/services/firebase/mappers';
import { useAuthStore } from '@/store/authStore';
import type {
  Address,
  AppSettingItem,
  Banner,
  Coupon,
  NotificationItem,
  Vehicle,
} from '@/types/domain';

async function resolveCurrentUserId(): Promise<string> {
  const cached = useAuthStore.getState().user?.id;
  if (cached) return cached;
  const { data } = await getMyProfile(dataConnect);
  const id = data.users[0]?.id;
  if (!id) throw new Error('يرجى تسجيل الدخول أولاً');
  return id;
}

export async function updateProfileInfo(payload: {
  fullName: string;
  phone?: string;
  area?: string;
  avatarUrl?: string;
}): Promise<void> {
  await updateMyProfile(dataConnect, payload);
}

export async function fetchAddresses(): Promise<Address[]> {
  const { data } = await listMyAddresses(dataConnect);
  return data.userAddresses.map(mapAddress);
}

export async function addAddress(
  payload: Omit<Address, 'id' | 'governorate'> & { governorate?: string },
): Promise<Address> {
  const userId = await resolveCurrentUserId();
  const { data } = await createMyAddress(dataConnect, {
    userId,
    label: payload.label,
    governorate: payload.governorate ?? payload.city,
    city: payload.city,
    area: payload.area,
    street: payload.street,
    building: payload.building ?? undefined,
    floor: payload.floor ?? undefined,
    apartment: payload.apartment ?? undefined,
    landmark: payload.landmark ?? undefined,
    latitude: payload.latitude ?? undefined,
    longitude: payload.longitude ?? undefined,
    isDefault: payload.isDefault,
    deliveryNotes: payload.deliveryNotes ?? undefined,
  });

  if (payload.isDefault) {
    await clearOtherDefaultAddresses(dataConnect, { keepId: data.userAddress_insert.id });
  }

  const all = await fetchAddresses();
  const created = all.find((a) => a.id === data.userAddress_insert.id);
  if (!created) throw new Error('تعذر حفظ العنوان');
  return created;
}

export async function setDefaultAddress(addressId: string): Promise<Address[]> {
  await setDefaultMyAddress(dataConnect, { id: addressId });
  return fetchAddresses();
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  const { data } = await listMyVehicles(dataConnect);
  return data.userVehicles.map((v) => ({
    id: v.id,
    make: v.make,
    model: v.model,
    year: v.year ?? null,
    color: v.color,
    plateNumber: v.plateNumber,
    isDefault: v.isDefault,
  }));
}

export async function addVehicle(payload: Omit<Vehicle, 'id'>): Promise<Vehicle[]> {
  const userId = await resolveCurrentUserId();
  await createMyVehicle(dataConnect, {
    userId,
    make: payload.make,
    model: payload.model,
    year: payload.year ?? undefined,
    color: payload.color,
    plateNumber: payload.plateNumber,
    isDefault: payload.isDefault,
  });
  return fetchVehicles();
}

export async function setDefaultVehicle(id: string): Promise<Vehicle[]> {
  await setDefaultMyVehicle(dataConnect, { id });
  return fetchVehicles();
}

export async function removeVehicle(id: string): Promise<Vehicle[]> {
  await softDeleteMyVehicle(dataConnect, { id });
  return fetchVehicles();
}

export async function fetchFavoriteIds(): Promise<string[]> {
  const { data } = await listMyFavorites(dataConnect);
  return data.userFavorites.map((f) => f.productId);
}

export async function toggleFavoriteRemote(
  productId: string,
  currentlyFavorite: boolean,
): Promise<boolean> {
  if (currentlyFavorite) {
    await removeMyFavorite(dataConnect, { productId });
    return false;
  }
  const userId = await resolveCurrentUserId();
  await addMyFavorite(dataConnect, { userId, productId });
  return true;
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const role = useAuthStore.getState().user?.role;
  if (role === 'admin' || role === 'sub_admin') {
    const { data } = await adminListStaffNotifications(dataConnect);
    return data.notifications.map((n) => mapNotification({ ...n, userId: null }));
  }
  const { data } = await listMyNotifications(dataConnect);
  return data.notifications.map(mapNotification);
}

export async function markAllNotificationsRead(): Promise<NotificationItem[]> {
  await markAllMyNotificationsRead(dataConnect);
  return fetchNotifications();
}

export async function fetchActiveBanners(): Promise<Banner[]> {
  const { data } = await listActiveBanners(dataConnect);
  return data.banners.map((b) => ({
    id: b.id,
    tag: b.tag,
    title: b.title,
    subtitle: b.subtitle,
    ctaLabel: b.ctaLabel,
    imageKey: b.imageUrl ?? 'promo-basket',
    categoryId: b.categoryId ?? null,
    productId: b.productId ?? null,
    sortOrder: b.sortOrder,
    isActive: b.isActive,
  }));
}

export async function fetchAppSettings(): Promise<AppSettingItem[]> {
  const { data } = await listAppSettings(dataConnect);
  return data.appSettings.map((s) => ({
    key: s.key,
    value: s.value,
    description: s.description ?? null,
  }));
}

export async function validateCoupon(code: string): Promise<Coupon | null> {
  const { data } = await validateCouponCode(dataConnect, { code: code.trim() });
  const c = data.coupons[0];
  if (!c) return null;
  return {
    id: c.id,
    code: c.code,
    type: c.type as Coupon['type'],
    value: c.value,
    minOrder: c.minOrder,
    maxDiscount: c.maxDiscount ?? null,
    usageLimit: c.usageLimit ?? null,
    usedCount: c.usedCount,
    expiresAt: c.expiresAt ?? null,
    isActive: c.isActive,
  };
}
