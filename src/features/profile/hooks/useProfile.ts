import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import {
  addAddress,
  addVehicle,
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
  return useQuery({
    queryKey: profileKeys.favorites,
    queryFn: fetchFavoriteIds,
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, currentlyFavorite }: { productId: string; currentlyFavorite: boolean }) =>
      toggleFavoriteRemote(productId, currentlyFavorite),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.favorites }),
  });
}

export function useNotifications() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...profileKeys.notifications, userId ?? 'guest'],
    queryFn: fetchNotifications,
    enabled: Boolean(userId),
    refetchInterval: 8_000,
    refetchOnWindowFocus: true,
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
