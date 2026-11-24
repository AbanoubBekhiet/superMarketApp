import { apiClient } from '@/services/api/client';
import type { User, UserAccountStatus } from '@/types/domain';

export async function fetchCustomers(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>('/customers');
  return data;
}

export async function updateCustomerStatus(
  customerId: string,
  status: UserAccountStatus,
): Promise<User> {
  const { data } = await apiClient.patch<User>(`/customers/${customerId}/status`, { status });
  return data;
}
