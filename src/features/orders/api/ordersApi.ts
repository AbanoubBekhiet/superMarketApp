import { adminListOrders, listMyOrders } from '@/dataconnect-generated';
import { callFunction, dataConnect } from '@/services/firebase/app';
import { mapAdminOrder, mapCustomerOrder } from '@/services/firebase/mappers';
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
  const role = useAuthStore.getState().user?.role;
  const isStaff = role === 'admin' || role === 'sub_admin';
  const statusVar = params.status && params.status !== 'all' ? params.status : undefined;

  if (isStaff && !params.customerId) {
    const { data } = await adminListOrders(dataConnect, { status: statusVar });
    return data.orders.map(mapAdminOrder);
  }

  const { data } = await listMyOrders(dataConnect, { status: statusVar });
  return data.orders.map(mapCustomerOrder);
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const res = await callFunction<
    CreateOrderPayload,
    {
      id: string;
      orderNumber: number;
      code: string;
      status: OrderStatus;
      subtotal: number;
      deliveryFee: number;
      discount: number;
      total: number;
    }
  >('placeOrder', payload);

  const myOrders = await fetchOrders({});
  const created = myOrders.find((o) => o.id === res.id);
  if (created) return created;

  return {
    id: res.id,
    orderNumber: res.orderNumber,
    code: res.code,
    customerId: '',
    customerName: '',
    customerArea: payload.customerArea,
    customerAddress: payload.addressSnapshot,
    itemsCount: payload.items.reduce((sum, i) => sum + i.quantity, 0),
    items: [],
    subtotal: res.subtotal,
    deliveryFee: res.deliveryFee,
    discount: res.discount,
    total: res.total,
    deliverySlot: payload.deliverySlot,
    paymentMethod: payload.paymentMethod,
    paymentStatus: payload.paymentMethod === 'cod' ? 'cod' : 'paid',
    status: res.status,
    placedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
  await callFunction<{ orderId: string; status: OrderStatus }, { id: string; status: OrderStatus }>(
    'updateOrderStatus',
    { orderId, status },
  );
  const all = await fetchOrders({});
  const updated = all.find((o) => o.id === orderId);
  if (!updated) throw new Error('الطلب غير موجود');
  return updated;
}
