import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Address } from '@/types/domain';
import {
  addAddress,
  fetchAddresses,
  fetchNotifications,
  markAllNotificationsRead,
  setDefaultAddress,
} from '../api/profileApi';

export const profileKeys = {
  addresses: ['addresses'] as const,
  notifications: ['notifications'] as const,
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
    mutationFn: (payload: Omit<Address, 'id'>) => addAddress(payload),
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

export function useNotifications() {
  return useQuery({
    queryKey: profileKeys.notifications,
    queryFn: fetchNotifications,
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: (updated) => qc.setQueryData(profileKeys.notifications, updated),
  });
}
