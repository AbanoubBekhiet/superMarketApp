import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { firestoreDb } from '@/services/firebase/app';
import type { ActiveCart, CartItem } from '@/types/domain';

export interface CartOwnerMeta {
  userId: string;
  customerName: string;
  customerPhone: string;
  customerArea: string;
}

interface FirestoreCartDoc {
  userId?: string;
  customerName?: string;
  customerPhone?: string;
  customerArea?: string;
  items?: CartItem[];
  itemsCount?: number;
  subtotal?: number;
  updatedAt?: string;
}

export async function fetchUserCart(userId: string): Promise<CartItem[]> {
  const snap = await getDoc(doc(firestoreDb, 'carts', userId));
  if (!snap.exists()) return [];
  const data = snap.data() as FirestoreCartDoc;
  return Array.isArray(data.items)
    ? data.items.filter((item) => item && item.productId && item.quantity > 0)
    : [];
}

export async function saveUserCart(
  owner: CartOwnerMeta,
  items: CartItem[],
): Promise<void> {
  const sanitized = items
    .filter((i) => i.productId && i.quantity > 0)
    .map((i) => ({
      productId: i.productId,
      weightOptionId: i.weightOptionId ?? null,
      name: i.name,
      imageKey: i.imageKey,
      unitLabel: i.unitLabel,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
    }));

  const itemsCount = sanitized.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = Number(
    sanitized.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0).toFixed(2),
  );

  await setDoc(doc(firestoreDb, 'carts', owner.userId), {
    userId: owner.userId,
    customerName: owner.customerName,
    customerPhone: owner.customerPhone,
    customerArea: owner.customerArea,
    items: sanitized,
    itemsCount,
    subtotal,
    updatedAt: new Date().toISOString(),
  });
}

export async function fetchActiveCarts(): Promise<ActiveCart[]> {
  const snap = await getDocs(collection(firestoreDb, 'carts'));
  const baseCarts = snap.docs
    .map((d) => {
      const data = d.data() as FirestoreCartDoc;
      const items = Array.isArray(data.items)
        ? data.items.filter((item) => item && item.productId && item.quantity > 0)
        : [];
      const itemsCount =
        typeof data.itemsCount === 'number'
          ? data.itemsCount
          : items.reduce((sum, i) => sum + i.quantity, 0);
      const subtotal =
        typeof data.subtotal === 'number'
          ? data.subtotal
          : Number(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0).toFixed(2));
      return {
        userId: data.userId ?? d.id,
        customerName: data.customerName ?? 'عميل طازج',
        customerPhone: data.customerPhone ?? '',
        customerArea: data.customerArea ?? '',
        items,
        itemsCount,
        subtotal,
        updatedAt: data.updatedAt ?? '',
      } satisfies ActiveCart;
    })
    .filter((cart) => cart.itemsCount > 0 && cart.items.length > 0)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return Promise.all(
    baseCarts.map(async (cart) => {
      const [userSnap, addrSnap] = await Promise.all([
        getDoc(doc(firestoreDb, 'users', cart.userId)).catch(() => null),
        getDocs(collection(firestoreDb, 'users', cart.userId, 'addresses')).catch(() => null),
      ]);
      const userData = userSnap?.exists()
        ? (userSnap.data() as {
            phone?: string | null;
            area?: string | null;
            latitude?: number | null;
            longitude?: number | null;
          })
        : null;
      const addrs = addrSnap?.docs.map(
        (d) =>
          d.data() as {
            street?: string;
            area?: string;
            city?: string;
            isDefault?: boolean;
            latitude?: number | null;
            longitude?: number | null;
          },
      ) ?? [];
      const primaryAddr = addrs.find((a) => a.isDefault) ?? addrs[0];
      const formattedAddr = primaryAddr
        ? [primaryAddr.street, primaryAddr.area, primaryAddr.city].filter(Boolean).join('، ')
        : undefined;
      return {
        ...cart,
        customerPhone: cart.customerPhone || userData?.phone || '',
        customerArea: cart.customerArea || primaryAddr?.area || userData?.area || '',
        customerAddress: formattedAddr,
        customerLatitude: primaryAddr?.latitude ?? userData?.latitude ?? null,
        customerLongitude: primaryAddr?.longitude ?? userData?.longitude ?? null,
      };
    }),
  );
}
