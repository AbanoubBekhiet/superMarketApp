import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { firestoreDb } from '@/services/firebase/app';
import { mapNotification, type FirestoreNotificationDoc } from '@/services/firebase/mappers';
import { useAuthStore } from '@/store/authStore';
import {
  addAddress,
  addVehicle,
  createBanner,
  deleteBanner,
  fetchActiveBanners,
  fetchAddresses,
  fetchAppSettings,
  fetchFavoriteIds,
  fetchNotifications,
  fetchVehicles,
  markAllNotificationsRead,
  removeVehicle,
  setDefaultAddress,
  setDefaultVehicle,
  toggleFavoriteRemote,
  updateAppSetting,
} from '../api/profileApi';

export const profileKeys = {
  addresses: ['addresses'] as const,
  vehicles: ['vehicles'] as const,
  favorites: ['favorites'] as const,
  notifications: ['notifications'] as const,
  banners: ['banners'] as const,
  settings: ['app-settings'] as const,
};

export function useAddresses() {
  return useQuery({
    queryKey: profileKeys.addresses,
    queryFn: fetchAddresses,
  });
}

export function useAddAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addAddress,
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.addresses }),
  });
}

export function useSetDefaultAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (addressId: string) => setDefaultAddress(addressId),
    onSuccess: (updated) => qc.setQueryData(profileKeys.addresses, updated),
  });
}

export function useVehicles() {
  return useQuery({
    queryKey: profileKeys.vehicles,
    queryFn: fetchVehicles,
  });
}

export function useAddVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addVehicle,
    onSuccess: (updated) => qc.setQueryData(profileKeys.vehicles, updated),
  });
}

export function useSetDefaultVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => setDefaultVehicle(id),
    onSuccess: (updated) => qc.setQueryData(profileKeys.vehicles, updated),
  });
}

export function useRemoveVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeVehicle(id),
    onSuccess: (updated) => qc.setQueryData(profileKeys.vehicles, updated),
  });
}

export function useFavoriteIds() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...profileKeys.favorites, userId ?? 'guest'],
    queryFn: fetchFavoriteIds,
    enabled: Boolean(userId),
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: ({ productId, currentlyFavorite }: { productId: string; currentlyFavorite: boolean }) =>
      toggleFavoriteRemote(productId, currentlyFavorite),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...profileKeys.favorites, userId ?? 'guest'] });
      void qc.invalidateQueries({ queryKey: profileKeys.favorites });
    },
  });
}

export function useNotifications() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const role = user?.role;
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return undefined;

    const isStaff = role === 'admin' || role === 'sub_admin';
    const primaryQuery = isStaff
      ? query(
          collection(firestoreDb, 'notifications'),
          where('targetRole', '==', 'staff'),
          orderBy('createdAt', 'desc'),
          limit(40),
        )
      : query(
          collection(firestoreDb, 'notifications'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(40),
        );

    const fallbackQuery = isStaff
      ? query(collection(firestoreDb, 'notifications'), where('targetRole', '==', 'staff'))
      : query(collection(firestoreDb, 'notifications'), where('userId', '==', userId));

    let fallbackUnsub: (() => void) | null = null;
    const unsubscribe = onSnapshot(
      primaryQuery,
      (snap) => {
        if (isStaff) {
          const items = snap.docs.map((d) =>
            mapNotification(d.id, d.data() as FirestoreNotificationDoc),
          );
          qc.setQueryData([...profileKeys.notifications, userId], items);
        } else {
          void qc.invalidateQueries({ queryKey: [...profileKeys.notifications, userId] });
        }
      },
      () => {
        if (fallbackUnsub) return;
        fallbackUnsub = onSnapshot(
          fallbackQuery,
          (snap) => {
            if (isStaff) {
              const items = snap.docs
                .map((d) => mapNotification(d.id, d.data() as FirestoreNotificationDoc))
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .slice(0, 40);
              qc.setQueryData([...profileKeys.notifications, userId], items);
            } else {
              void qc.invalidateQueries({ queryKey: [...profileKeys.notifications, userId] });
            }
          },
          () => undefined,
        );
      },
    );

    return () => {
      unsubscribe();
      fallbackUnsub?.();
    };
  }, [qc, role, userId]);

  return useQuery({
    queryKey: [...profileKeys.notifications, userId ?? 'guest'],
    queryFn: fetchNotifications,
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: (updated) => {
      qc.setQueryData([...profileKeys.notifications, userId ?? 'guest'], updated);
      void qc.invalidateQueries({ queryKey: profileKeys.notifications });
    },
  });
}

export function useBanners() {
  return useQuery({
    queryKey: profileKeys.banners,
    queryFn: fetchActiveBanners,
  });
}

export function useAppSettings() {
  return useQuery({
    queryKey: profileKeys.settings,
    queryFn: fetchAppSettings,
  });
}

export function useUpdateAppSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value, description }: { key: string; value: string; description?: string }) =>
      updateAppSetting(key, value, description),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.settings }),
  });
}

export function useCreateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createBanner,
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.banners }),
  });
}

export function useDeleteBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBanner(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.banners }),
  });
}
