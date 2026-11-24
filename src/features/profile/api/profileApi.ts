import { apiClient } from '@/services/api/client';
import type { Address, NotificationItem } from '@/types/domain';

export async function fetchAddresses(): Promise<Address[]> {
  const { data } = await apiClient.get<Address[]>('/addresses');
  return data;
}

export async function addAddress(payload: Omit<Address, 'id'>): Promise<Address> {
  const { data } = await apiClient.post<Address>('/addresses', payload);
  return data;
}

export async function setDefaultAddress(addressId: string): Promise<Address[]> {
  const { data } = await apiClient.patch<Address[]>(`/addresses/${addressId}/default`);
  return data;
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const { data } = await apiClient.get<NotificationItem[]>('/notifications');
  return data;
}

export async function markAllNotificationsRead(): Promise<NotificationItem[]> {
  const { data } = await apiClient.post<NotificationItem[]>('/notifications/read-all');
  return data;
}
