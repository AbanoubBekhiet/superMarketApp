import { apiClient } from '@/services/api/client';
import type { DeliveryTimeSlot, Order, OrderItem, OrderStatus, PaymentMethod } from '@/types/domain';

export interface CreateOrderPayload {
  customerId: string;
  customerName: string;
  customerArea: string;
  customerAddress: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  promoCode?: string;
  deliverySlot: DeliveryTimeSlot;
  paymentMethod: PaymentMethod;
}

export async function fetchOrders(params: { customerId?: string; status?: string } = {}): Promise<Order[]> {
  const { data } = await apiClient.get<Order[]>('/orders', { params });
  return data;
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const { data } = await apiClient.post<Order>('/orders', payload);
  return data;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
  const { data } = await apiClient.patch<Order>(`/orders/${orderId}/status`, { status });
  return data;
}
