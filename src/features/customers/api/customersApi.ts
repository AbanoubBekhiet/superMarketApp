import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { firestoreDb } from '@/services/firebase/app';
import {
  mapAddress,
  mapCustomer,
  type FirestoreOrderDoc,
  type FirestoreUserDoc,
} from '@/services/firebase/mappers';
import type { Address, Order, User, UserAccountStatus } from '@/types/domain';

export async function fetchCustomers(): Promise<User[]> {
  const [usersSnap, ordersSnap] = await Promise.all([
    getDocs(query(collection(firestoreDb, 'users'), where('role', '==', 'customer'))),
    getDocs(query(collection(firestoreDb, 'orders'), orderBy('placedAt', 'desc'))),
  ]);

  const ordersByUser = new Map<string, { total: number; status: Order['status']; code: string }[]>();
  ordersSnap.docs.forEach((d) => {
    const o = d.data() as FirestoreOrderDoc;
    const list = ordersByUser.get(o.userId) ?? [];
    list.push({ total: o.total, status: o.status, code: o.code });
    ordersByUser.set(o.userId, list);
  });

  return usersSnap.docs
    .map((d) => ({ id: d.id, data: d.data() as FirestoreUserDoc }))
    .filter(({ data }) => !data.deletedAt)
    .sort((a, b) => (b.data.createdAt ?? '').localeCompare(a.data.createdAt ?? ''))
    .map(({ id, data }) => mapCustomer(id, data, ordersByUser.get(id) ?? []));
}

export async function updateCustomerStatus(
  customerId: string,
  status: UserAccountStatus,
): Promise<User> {
  const ref = doc(firestoreDb, 'users', customerId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('العميل غير موجود');

  await updateDoc(ref, {
    isActive: status === 'active',
    updatedAt: new Date().toISOString(),
  });

  const all = await fetchCustomers();
  const updated = all.find((c) => c.id === customerId);
  if (!updated) throw new Error('العميل غير موجود');
  return updated;
}

export async function fetchCustomerAddresses(customerId: string): Promise<Address[]> {
  const snap = await getDocs(collection(firestoreDb, 'users', customerId, 'addresses'));
  return snap.docs.map((d) => mapAddress(d.id, d.data() as Omit<Address, 'id'>));
}
