import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '@/services/firebase/app';
import {
  mapAddress,
  mapNotification,
  type FirestoreNotificationDoc,
} from '@/services/firebase/mappers';
import { useAuthStore } from '@/store/authStore';
import type {
  Address,
  AppSettingItem,
  Banner,
  Coupon,
  NotificationItem,
  Vehicle,
} from '@/types/domain';

function resolveCurrentUserId(): string {
  const uid = useAuthStore.getState().user?.id ?? firebaseAuth.currentUser?.uid;
  if (!uid) throw new Error('يرجى تسجيل الدخول أولاً');
  return uid;
}

export async function updateProfileInfo(payload: {
  fullName: string;
  phone?: string;
  area?: string;
  avatarUrl?: string;
}): Promise<void> {
  const uid = resolveCurrentUserId();
  await updateDoc(doc(firestoreDb, 'users', uid), {
    fullName: payload.fullName.trim(),
    ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
    ...(payload.area !== undefined ? { area: payload.area } : {}),
    ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl } : {}),
    updatedAt: new Date().toISOString(),
  });
}

export async function fetchAddresses(): Promise<Address[]> {
  const uid = resolveCurrentUserId();
  const snap = await getDocs(collection(firestoreDb, 'users', uid, 'addresses'));
  const list = snap.docs.map((d) => mapAddress(d.id, d.data() as Omit<Address, 'id'>));
  const primary = list.find((a) => a.isDefault) ?? list[0];
  return primary ? [{ ...primary, isDefault: true }] : [];
}

export async function addAddress(
  payload: Omit<Address, 'id' | 'governorate'> & { governorate?: string },
): Promise<Address> {
  const uid = resolveCurrentUserId();
  const colRef = collection(firestoreDb, 'users', uid, 'addresses');
  const existing = await getDocs(colRef);

  const data: Omit<Address, 'id'> = {
    label: payload.label,
    governorate: payload.governorate ?? payload.city,
    city: payload.city,
    area: payload.area,
    street: payload.street,
    building: payload.building ?? null,
    floor: payload.floor ?? null,
    apartment: payload.apartment ?? null,
    landmark: payload.landmark ?? null,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    isDefault: true,
    deliveryNotes: payload.deliveryNotes ?? null,
  };

  let savedId: string;
  if (existing.docs.length > 0) {
    const primaryDoc =
      existing.docs.find((d) => (d.data() as { isDefault?: boolean }).isDefault) ?? existing.docs[0];
    savedId = primaryDoc.id;
    const batch = writeBatch(firestoreDb);
    batch.set(primaryDoc.ref, data);
    existing.docs.forEach((d) => {
      if (d.id !== primaryDoc.id) {
        batch.delete(d.ref);
      }
    });
    await batch.commit();
  } else {
    const ref = await addDoc(colRef, data);
    savedId = ref.id;
  }

  await updateDoc(doc(firestoreDb, 'users', uid), {
    area: payload.area,
    ...(payload.latitude != null && payload.longitude != null
      ? { latitude: payload.latitude, longitude: payload.longitude }
      : {}),
    updatedAt: new Date().toISOString(),
  }).catch(() => undefined);

  return { id: savedId, ...data };
}

export async function setDefaultAddress(addressId: string): Promise<Address[]> {
  const uid = resolveCurrentUserId();
  const colRef = collection(firestoreDb, 'users', uid, 'addresses');
  const existing = await getDocs(colRef);
  const batch = writeBatch(firestoreDb);
  existing.docs.forEach((d) => {
    batch.update(d.ref, { isDefault: d.id === addressId });
  });
  await batch.commit();
  return fetchAddresses();
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  const uid = resolveCurrentUserId();
  const snap = await getDocs(collection(firestoreDb, 'users', uid, 'vehicles'));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Vehicle, 'id'> & { deletedAt?: string | null }) }))
    .filter((v) => !v.deletedAt)
    .map(({ deletedAt: _d, ...rest }) => rest);
}

export async function addVehicle(payload: Omit<Vehicle, 'id'>): Promise<Vehicle[]> {
  const uid = resolveCurrentUserId();
  const colRef = collection(firestoreDb, 'users', uid, 'vehicles');
  if (payload.isDefault) {
    const existing = await getDocs(colRef);
    const batch = writeBatch(firestoreDb);
    existing.docs.forEach((d) => {
      batch.update(d.ref, { isDefault: false });
    });
    await batch.commit();
  }
  await addDoc(colRef, {
    make: payload.make,
    model: payload.model,
    year: payload.year ?? null,
    color: payload.color,
    plateNumber: payload.plateNumber,
    isDefault: payload.isDefault,
    deletedAt: null,
  });
  return fetchVehicles();
}

export async function setDefaultVehicle(id: string): Promise<Vehicle[]> {
  const uid = resolveCurrentUserId();
  const colRef = collection(firestoreDb, 'users', uid, 'vehicles');
  const existing = await getDocs(colRef);
  const batch = writeBatch(firestoreDb);
  existing.docs.forEach((d) => {
    batch.update(d.ref, { isDefault: d.id === id });
  });
  await batch.commit();
  return fetchVehicles();
}

export async function removeVehicle(id: string): Promise<Vehicle[]> {
  const uid = resolveCurrentUserId();
  await deleteDoc(doc(firestoreDb, 'users', uid, 'vehicles', id));
  return fetchVehicles();
}

export async function fetchFavoriteIds(): Promise<string[]> {
  const uid = resolveCurrentUserId();
  const snap = await getDocs(collection(firestoreDb, 'users', uid, 'favorites'));
  return snap.docs.map((d) => d.id);
}

export async function toggleFavoriteRemote(
  productId: string,
  currentlyFavorite: boolean,
): Promise<boolean> {
  const uid = resolveCurrentUserId();
  const favRef = doc(firestoreDb, 'users', uid, 'favorites', productId);
  if (currentlyFavorite) {
    await deleteDoc(favRef);
    return false;
  }
  await setDoc(favRef, { productId, createdAt: new Date().toISOString() });
  return true;
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const user = useAuthStore.getState().user;
  const uid = user?.id ?? firebaseAuth.currentUser?.uid;
  if (!uid) return [];

  if (user?.role === 'admin' || user?.role === 'sub_admin') {
    try {
      const snap = await getDocs(
        query(
          collection(firestoreDb, 'notifications'),
          where('targetRole', '==', 'staff'),
          orderBy('createdAt', 'desc'),
          limit(40),
        ),
      );
      return snap.docs.map((d) => mapNotification(d.id, d.data() as FirestoreNotificationDoc));
    } catch {
      const fallbackSnap = await getDocs(
        query(collection(firestoreDb, 'notifications'), where('targetRole', '==', 'staff')),
      );
      return fallbackSnap.docs
        .map((d) => mapNotification(d.id, d.data() as FirestoreNotificationDoc))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 40);
    }
  }

  const [personalSnap, globalSnap] = await Promise.all([
    getDocs(
      query(
        collection(firestoreDb, 'notifications'),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(40),
      ),
    ),
    getDocs(
      query(
        collection(firestoreDb, 'notifications'),
        where('targetRole', '==', 'customer'),
        orderBy('createdAt', 'desc'),
        limit(20),
      ),
    ).catch(() => null),
  ]);

  const combined = new Map<string, NotificationItem>();
  personalSnap.docs.forEach((d) =>
    combined.set(d.id, mapNotification(d.id, d.data() as FirestoreNotificationDoc)),
  );
  globalSnap?.docs.forEach((d) => {
    if (!combined.has(d.id)) {
      combined.set(d.id, mapNotification(d.id, d.data() as FirestoreNotificationDoc));
    }
  });

  return Array.from(combined.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function markAllNotificationsRead(): Promise<NotificationItem[]> {
  const user = useAuthStore.getState().user;
  const uid = user?.id ?? firebaseAuth.currentUser?.uid;
  if (!uid) return [];

  const q =
    user?.role === 'admin' || user?.role === 'sub_admin'
      ? query(
          collection(firestoreDb, 'notifications'),
          where('targetRole', '==', 'staff'),
          orderBy('createdAt', 'desc'),
          limit(40),
        )
      : query(
          collection(firestoreDb, 'notifications'),
          where('userId', '==', uid),
          orderBy('createdAt', 'desc'),
          limit(40),
        );

  const snap = await getDocs(q);
  const unreadDocs = snap.docs.filter((d) => !(d.data() as FirestoreNotificationDoc).isRead);
  if (unreadDocs.length > 0) {
    const batch = writeBatch(firestoreDb);
    unreadDocs.forEach((d) => {
      batch.update(doc(firestoreDb, 'notifications', d.id), { isRead: true });
    });
    await batch.commit();
  }

  return fetchNotifications();
}

export async function fetchActiveBanners(): Promise<Banner[]> {
  const snap = await getDocs(collection(firestoreDb, 'banners'));
  return snap.docs
    .map((d) => ({
      id: d.id,
      ...(d.data() as {
        tag: string;
        title: string;
        subtitle: string;
        ctaLabel: string;
        imageUrl?: string | null;
        categoryId?: string | null;
        productId?: string | null;
        sortOrder?: number;
        isActive?: boolean;
        deletedAt?: string | null;
      }),
    }))
    .filter((b) => !b.deletedAt && b.isActive !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((b) => ({
      id: b.id,
      tag: b.tag,
      title: b.title,
      subtitle: b.subtitle,
      ctaLabel: b.ctaLabel,
      imageKey: b.imageUrl ?? 'promo-basket',
      categoryId: b.categoryId ?? null,
      productId: b.productId ?? null,
      sortOrder: b.sortOrder ?? 0,
      isActive: true,
    }));
}

export async function fetchAppSettings(): Promise<AppSettingItem[]> {
  const snap = await getDocs(collection(firestoreDb, 'appSettings'));
  return snap.docs
    .map((d) => d.data() as { key?: string; value?: string; description?: string | null })
    .filter((s) => Boolean(s.key) && s.key !== 'onesignal_app_id')
    .map((s) => ({
      key: s.key!,
      value: s.value ?? '',
      description: s.description ?? null,
    }));
}

export async function updateAppSetting(
  key: string,
  value: string,
  description?: string,
): Promise<void> {
  await setDoc(
    doc(firestoreDb, 'appSettings', key),
    {
      key,
      value: value.trim(),
      ...(description ? { description } : {}),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

export async function createBanner(payload: {
  tag: string;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  imageUrl?: string | null;
  sortOrder?: number;
}): Promise<void> {
  const now = new Date().toISOString();
  await addDoc(collection(firestoreDb, 'banners'), {
    tag: payload.tag.trim() || 'عرض خاص',
    title: payload.title.trim(),
    subtitle: payload.subtitle.trim(),
    ctaLabel: payload.ctaLabel?.trim() || 'تسوق الآن',
    imageUrl: payload.imageUrl ?? 'local://promo-basket',
    categoryId: null,
    productId: null,
    sortOrder: payload.sortOrder ?? 0,
    isActive: true,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

export async function deleteBanner(id: string): Promise<void> {
  await updateDoc(doc(firestoreDb, 'banners', id), {
    deletedAt: new Date().toISOString(),
    isActive: false,
    updatedAt: new Date().toISOString(),
  });
}

export async function validateCoupon(code: string): Promise<Coupon | null> {
  const snap = await getDocs(
    query(collection(firestoreDb, 'coupons'), where('code', '==', code.trim())),
  );
  const matched = snap.docs.find((d) => {
    const c = d.data() as { isActive?: boolean; deletedAt?: string | null };
    return c.isActive !== false && !c.deletedAt;
  });
  if (!matched) return null;

  const c = matched.data() as {
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    minOrder: number;
    maxDiscount?: number | null;
    usageLimit?: number | null;
    usedCount?: number;
    expiresAt?: string | null;
    isActive: boolean;
  };
  if (c.expiresAt && new Date(c.expiresAt).getTime() <= Date.now()) return null;
  if (c.usageLimit && (c.usedCount ?? 0) >= c.usageLimit) return null;

  return {
    id: matched.id,
    code: c.code,
    type: c.type,
    value: c.value,
    minOrder: c.minOrder,
    maxDiscount: c.maxDiscount ?? null,
    usageLimit: c.usageLimit ?? null,
    usedCount: c.usedCount ?? 0,
    expiresAt: c.expiresAt ?? null,
    isActive: c.isActive,
  };
}
