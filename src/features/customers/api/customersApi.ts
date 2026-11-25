import { adminListCustomers } from '@/dataconnect-generated';
import { callFunction, dataConnect } from '@/services/firebase/app';
import { mapCustomer } from '@/services/firebase/mappers';
import type { User, UserAccountStatus } from '@/types/domain';

export async function fetchCustomers(): Promise<User[]> {
  const { data } = await adminListCustomers(dataConnect);
  return data.users.map(mapCustomer);
}

export async function updateCustomerStatus(
  customerId: string,
  status: UserAccountStatus,
): Promise<User> {
  await callFunction<{ customerId: string; isActive: boolean }, { id: string; isActive: boolean }>(
    'setCustomerStatus',
    { customerId, isActive: status === 'active' },
  );
  const all = await fetchCustomers();
  const updated = all.find((c) => c.id === customerId);
  if (!updated) throw new Error('العميل غير موجود');
  return updated;
}
