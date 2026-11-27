import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  where,
} from 'firebase/firestore';
import { dispatchStaffOneSignalPush } from '@/lib/notifications';
import { firebaseAuth, firestoreDb } from '@/services/firebase/app';
import {
  mapOrder,
  type FirestoreOrderDoc,
  type FirestoreProductDoc,
} from '@/services/firebase/mappers';
import { useAuthStore } from '@/store/authStore';
import type { DeliveryTimeSlot, Order, OrderStatus, PaymentMethod } from '@/types/domain';

export interface CreateOrderItemInput {
  productId: string;
  weightOptionId?: string | null;
  quantity: number;
}

export interface CreateOrderPayload {
  addressId?: string;
  addressSnapshot: string;
  customerArea: string;
  customerLatitude?: number | null;
  customerLongitude?: number | null;
  vehicleId?: string | null;
  deliverySlot: DeliveryTimeSlot;
  paymentMethod: PaymentMethod;
  couponCode?: string | null;
  notes?: string | null;
  items: CreateOrderItemInput[];
}

export async function fetchOrders(
  params: { customerId?: string; status?: string } = {},
): Promise<Order[]> {
  const user = useAuthStore.getState().user;
  const uid = user?.id ?? firebaseAuth.currentUser?.uid;
  const isStaff = user?.role === 'admin' || user?.role === 'sub_admin';

  const snap = isStaff && !params.customerId
    ? await getDocs(query(collection(firestoreDb, 'orders'), orderBy('placedAt', 'desc')))
    : await getDocs(
        query(
          collection(firestoreDb, 'orders'),
          where('userId', '==', params.customerId ?? uid ?? ''),
          orderBy('placedAt', 'desc'),
        ),
      );

  let orders = snap.docs.map((d) => mapOrder(d.id, d.data() as FirestoreOrderDoc));

  if (isStaff) {
    const enrichCustomerIds = Array.from(
      new Set(
        orders
          .filter(
            (o) =>
              o.customerId &&
              (!o.customerPhone || (o.customerLatitude == null && o.customerLongitude == null)),
          )
          .map((o) => o.customerId),
      ),
    );
    if (enrichCustomerIds.length > 0) {
      const userInfos = await Promise.all(
        enrichCustomerIds.map(async (customerId) => {
          const [uSnap, addrSnap] = await Promise.all([
            getDoc(doc(firestoreDb, 'users', customerId)).catch(() => null),
            getDocs(collection(firestoreDb, 'users', customerId, 'addresses')).catch(() => null),
          ]);
          const uData = uSnap?.exists()
            ? (uSnap.data() as {
                phone?: string | null;
                latitude?: number | null;
                longitude?: number | null;
              })
            : null;
          const addrs = addrSnap?.docs.map((d) => d.data() as {
            isDefault?: boolean;
            latitude?: number | null;
            longitude?: number | null;
          }) ?? [];
          const primaryAddr = addrs.find((a) => a.isDefault) ?? addrs[0];
          return {
            customerId,
            phone: uData?.phone?.trim() || undefined,
            latitude: primaryAddr?.latitude ?? uData?.latitude ?? null,
            longitude: primaryAddr?.longitude ?? uData?.longitude ?? null,
          };
        }),
      );
      const infoByUserId = new Map(userInfos.map((info) => [info.customerId, info]));
      orders = orders.map((o) => {
        const info = infoByUserId.get(o.customerId);
        if (!info) return o;
        return {
          ...o,
          customerPhone: o.customerPhone ?? info.phone,
          customerLatitude: o.customerLatitude ?? info.latitude,
          customerLongitude: o.customerLongitude ?? info.longitude,
        };
      });
    }
  }

  if (params.status && params.status !== 'all') {
    orders = orders.filter((o) => o.status === params.status);
  }
  return orders;
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const authUser = useAuthStore.getState().user;
  const uid = firebaseAuth.currentUser?.uid ?? authUser?.id;
  const customerName = authUser?.name ?? 'عميل طازج';
  const customerPhone = authUser?.phone?.trim() || null;
  if (!uid) throw new Error('يرجى تسجيل الدخول أولاً');
  if (payload.items.length === 0) throw new Error('السلة فارغة');

  // Pre-fetch settings and coupon info
  const [settingsSnap, couponsSnap] = await Promise.all([
    getDocs(collection(firestoreDb, 'appSettings')),
    payload.couponCode
      ? getDocs(
          query(
            collection(firestoreDb, 'coupons'),
            where('code', '==', payload.couponCode.trim()),
          ),
        )
      : Promise.resolve(null),
  ]);

  const settingsMap = new Map<string, string>();
  settingsSnap.docs.forEach((d) => {
    const s = d.data() as { key?: string; value?: string };
    if (s.key) settingsMap.set(s.key, s.value ?? '');
  });
  const baseDeliveryFee = Number(settingsMap.get('delivery_fee') ?? '20') || 20;
  const freeThreshold = Number(settingsMap.get('free_delivery_threshold') ?? '450') || 0;

  const couponDoc = couponsSnap?.docs.find((d) => {
    const c = d.data() as { isActive?: boolean; deletedAt?: string | null };
    return c.isActive !== false && !c.deletedAt;
  });

  const now = new Date().toISOString();
  const orderRef = doc(collection(firestoreDb, 'orders'));
  const counterRef = doc(firestoreDb, 'appMeta', 'orderCounter');

  const createdOrderData = await runTransaction(firestoreDb, async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const prevNumber = counterSnap.exists()
      ? ((counterSnap.data() as { lastNumber?: number }).lastNumber ?? 0)
      : 0;
    const orderNumber = prevNumber + 1;
    const code = `ORD-${orderNumber}`;

    let subtotal = 0;
    const resolvedItems: NonNullable<FirestoreOrderDoc['items']> = [];

    for (const item of payload.items) {
      const prodSnap = await tx.get(doc(firestoreDb, 'products', item.productId));
      if (!prodSnap.exists()) {
        throw new Error('أحد المنتجات المختارة غير متوفر');
      }
      const p = prodSnap.data() as FirestoreProductDoc;
      if (p.deletedAt || p.isActive === false) {
        throw new Error(`المنتج "${p.name}" غير متاح حالياً`);
      }

      const matchedWeight = item.weightOptionId
        ? p.weights?.find((w) => w.id === item.weightOptionId)
        : undefined;
      const unitPrice = matchedWeight
        ? (matchedWeight.salePrice ?? matchedWeight.price)
        : (p.salePrice ?? p.price);
      const unitLabel = matchedWeight?.label ?? p.unit ?? 'عبوة';
      const lineTotal = Number((unitPrice * item.quantity).toFixed(2));
      subtotal += lineTotal;

      resolvedItems.push({
        productId: item.productId,
        name: p.name,
        unitLabel,
        unitPrice,
        quantity: item.quantity,
        lineTotal,
        imageKey: p.imageUrl ?? 'local://logo',
      });
    }

    subtotal = Number(subtotal.toFixed(2));
    const deliveryFee = freeThreshold > 0 && subtotal >= freeThreshold ? 0 : baseDeliveryFee;

    let discount = 0;
    if (couponDoc) {
      const c = couponDoc.data() as {
        type: 'percentage' | 'fixed';
        value: number;
        minOrder: number;
        maxDiscount?: number | null;
        usageLimit?: number | null;
        usedCount?: number;
        expiresAt?: string | null;
      };
      const notExpired = !c.expiresAt || new Date(c.expiresAt).getTime() > Date.now();
      const underLimit = !c.usageLimit || (c.usedCount ?? 0) < c.usageLimit;
      if (notExpired && underLimit && subtotal >= c.minOrder) {
        const rawDisc = c.type === 'percentage' ? (subtotal * c.value) / 100 : c.value;
        const capped = c.maxDiscount ? Math.min(rawDisc, c.maxDiscount) : rawDisc;
        discount = Number(Math.min(capped, subtotal).toFixed(2));
        tx.update(doc(firestoreDb, 'coupons', couponDoc.id), {
          usedCount: (c.usedCount ?? 0) + 1,
        });
      }
    }

    const total = Number(Math.max(0, subtotal + deliveryFee - discount).toFixed(2));

    tx.set(counterRef, { lastNumber: orderNumber }, { merge: true });

    const docPayload: FirestoreOrderDoc = {
      orderNumber,
      code,
      userId: uid,
      customerNameSnapshot: customerName,
      customerPhoneSnapshot: customerPhone,
      customerAreaSnapshot: payload.customerArea,
      addressSnapshot: payload.addressSnapshot,
      customerLatitude: payload.customerLatitude ?? authUser?.latitude ?? null,
      customerLongitude: payload.customerLongitude ?? authUser?.longitude ?? null,
      subtotal,
      deliveryFee,
      freeDeliveryThreshold: freeThreshold,
      discount,
      total,
      promoCode: discount > 0 ? (payload.couponCode ?? null) : null,
      deliverySlot: payload.deliverySlot,
      paymentMethod: payload.paymentMethod,
      paymentStatus: payload.paymentMethod === 'cod' ? 'cod' : 'paid',
      status: 'pending',
      etaMinutes: 25,
      placedAt: now,
      deliveredAt: null,
      items: resolvedItems,
      statusHistory: [
        {
          id: `hist-${Date.now()}`,
          fromStatus: null,
          toStatus: 'pending',
          note: 'تم استلام الطلب',
          changedByName: customerName,
          createdAt: now,
        },
      ],
    };

    tx.set(orderRef, { ...docPayload, createdAt: now, updatedAt: now });
    return docPayload;
  });

  const formattedTotal = new Intl.NumberFormat('ar-EG', {
    numberingSystem: 'latn',
    maximumFractionDigits: 2,
  }).format(createdOrderData.total);

  // Create confirmation notification for customer + real-time alert for staff
  await Promise.all([
    addDoc(collection(firestoreDb, 'notifications'), {
      userId: uid,
      targetRole: null,
      title: 'تم استلام طلبك بنجاح',
      body: `تم استلام طلبك رقم ${createdOrderData.code} بنجاح وجارٍ مراجعته الآن.`,
      type: 'order_update',
      dataPayload: JSON.stringify({ orderId: orderRef.id, status: 'pending' }),
      isRead: false,
      createdAt: now,
    }).catch(() => undefined),
    addDoc(collection(firestoreDb, 'notifications'), {
      userId: null,
      targetRole: 'staff',
      title: 'طلب جديد وارد',
      body: `وصل طلب جديد برقم ${createdOrderData.code} من ${customerName} بقيمة ${formattedTotal} ج.م.`,
      type: 'admin_alert',
      dataPayload: JSON.stringify({ orderId: orderRef.id, kind: 'new_order' }),
      isRead: false,
      createdAt: now,
    }).catch(() => undefined),
  ]);

  return mapOrder(orderRef.id, createdOrderData);
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
  const orderRef = doc(firestoreDb, 'orders', orderId);
  const snap = await getDoc(orderRef);
  if (!snap.exists()) throw new Error('الطلب غير موجود');

  const current = snap.data() as FirestoreOrderDoc;
  const now = new Date().toISOString();
  const actorName = useAuthStore.getState().user?.name ?? 'الإدارة';

  const paymentStatus =
    status === 'delivered'
      ? 'paid'
      : status === 'cancelled' && current.paymentStatus === 'paid'
        ? 'refunded'
        : current.paymentStatus ?? 'cod';

  const nextHistory = [
    ...(current.statusHistory ?? []),
    {
      id: `hist-${Date.now()}`,
      fromStatus: current.status,
      toStatus: status,
      note: `تحديث الحالة إلى ${status}`,
      changedByName: actorName,
      createdAt: now,
    },
  ];

  await updateDoc(orderRef, {
    status,
    paymentStatus,
    deliveredAt: status === 'delivered' ? now : (current.deliveredAt ?? null),
    statusHistory: nextHistory,
    updatedAt: now,
  });

  if (current.userId) {
    const title = 'تحديث حالة الطلب';
    const body = `تم تحديث حالة طلبك رقم ${current.code}.`;
    await addDoc(collection(firestoreDb, 'notifications'), {
      userId: current.userId,
      targetRole: null,
      title,
      body,
      type: 'order_update',
      dataPayload: JSON.stringify({ orderId, status }),
      isRead: false,
      createdAt: now,
    }).catch(() => undefined);

    void dispatchStaffOneSignalPush({
      title,
      body,
      externalIds: [current.userId],
      data: { orderId, status },
    });
  }

  return mapOrder(orderId, {
    ...current,
    status,
    paymentStatus,
    deliveredAt: status === 'delivered' ? now : (current.deliveredAt ?? null),
    statusHistory: nextHistory,
  });
}
