import { sanitizePublicEmail } from '@/lib/phoneAuth';
import type {
  Address,
  Category,
  DeliveryTimeSlot,
  NotificationItem,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
  ProductWeightOption,
  User,
} from '@/types/domain';

export interface FirestoreCategoryDoc {
  parentId?: string | null;
  name: string;
  slug?: string;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  deletedAt?: string | null;
}

export interface FirestoreProductDoc {
  categoryId: string;
  categoryName?: string;
  subcategoryId?: string | null;
  name: string;
  slug?: string;
  description?: string;
  brand?: string;
  price: number;
  salePrice?: number | null;
  sku?: string;
  barcode?: string | null;
  unit?: string;
  piecesPerUnit?: number;
  stockQuantity?: number;
  lowStockThreshold?: number;
  imageUrl?: string | null;
  isActive?: boolean;
  isFeatured?: boolean;
  isDailyOffer?: boolean;
  badgeText?: string | null;
  weights?: {
    id: string;
    label: string;
    price: number;
    salePrice?: number | null;
    sortOrder?: number;
    isDefault?: boolean;
  }[];
  deletedAt?: string | null;
}

export interface FirestoreOrderDoc {
  orderNumber: number;
  code: string;
  userId: string;
  customerNameSnapshot: string;
  customerAreaSnapshot: string;
  addressSnapshot: string;
  subtotal: number;
  deliveryFee: number;
  freeDeliveryThreshold?: number;
  discount: number;
  total: number;
  promoCode?: string | null;
  deliverySlot?: DeliveryTimeSlot;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  status: OrderStatus;
  courierName?: string | null;
  courierPhone?: string | null;
  etaMinutes?: number | null;
  placedAt: string;
  deliveredAt?: string | null;
  items?: {
    productId: string;
    name: string;
    unitLabel: string;
    unitPrice: number;
    quantity: number;
    lineTotal?: number;
    imageKey?: string;
  }[];
  statusHistory?: {
    id: string;
    fromStatus?: string | null;
    toStatus: OrderStatus;
    note?: string | null;
    changedByName?: string | null;
    createdAt: string;
  }[];
}

export interface FirestoreUserDoc {
  firebaseUid: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  role: User['role'];
  isActive: boolean;
  area?: string;
  latitude?: number | null;
  longitude?: number | null;
  deletedAt?: string | null;
  createdAt?: string;
}

export interface FirestoreNotificationDoc {
  userId?: string | null;
  targetRole?: string | null;
  title: string;
  body: string;
  type: NotificationItem['type'];
  dataPayload?: string | null;
  isRead: boolean;
  createdAt: string;
}

export function formatRelativeArabic(iso: string): string {
  const diffMin = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  const diffDays = Math.round(diffHours / 24);
  return `منذ ${diffDays} يوم`;
}

export function mapCategories(
  rows: (FirestoreCategoryDoc & { id: string })[],
  productCounts: Map<string, number>,
): Category[] {
  const parents = rows.filter((r) => !r.parentId);
  const children = rows.filter((r) => Boolean(r.parentId));

  return parents
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((parent) => ({
      id: parent.id,
      parentId: null,
      name: parent.name,
      slug: parent.slug,
      imageKey: parent.imageUrl ?? 'local://logo',
      productCount: productCounts.get(parent.id) ?? 0,
      sortOrder: parent.sortOrder ?? 0,
      isActive: parent.isActive ?? true,
      subcategories: children
        .filter((c) => c.parentId === parent.id)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((sub) => ({
          id: sub.id,
          categoryId: parent.id,
          name: sub.name,
          isActive: sub.isActive ?? true,
        })),
    }));
}

export function mapProduct(
  id: string,
  row: FirestoreProductDoc,
  categoryMap: Map<string, string>,
): Product {
  const effectivePrice = row.salePrice ?? row.price;
  const oldPrice = row.salePrice ? row.price : undefined;
  const discountPercent =
    oldPrice && oldPrice > effectivePrice
      ? Math.round(((oldPrice - effectivePrice) / oldPrice) * 100)
      : undefined;

  const weights: ProductWeightOption[] = (row.weights ?? []).map((w) => ({
    id: w.id,
    label: w.label,
    price: w.salePrice ?? w.price,
    oldPrice: w.salePrice ? w.price : undefined,
  }));

  return {
    id,
    sku: row.sku ?? `TZ-${id.slice(0, 6).toUpperCase()}`,
    barcode: row.barcode ?? null,
    name: row.name,
    brand: row.brand ?? 'مزارع طازج',
    categoryId: row.categoryId,
    categoryName: categoryMap.get(row.categoryId) ?? row.categoryName ?? '',
    subcategoryId: row.subcategoryId ?? undefined,
    description: row.description ?? '',
    imageKey: row.imageUrl ?? 'local://logo',
    unitLabel: row.unit ?? 'عبوة',
    piecesPerUnit:
      typeof row.piecesPerUnit === 'number' && row.piecesPerUnit > 0
        ? Math.round(row.piecesPerUnit)
        : undefined,
    price: effectivePrice,
    oldPrice,
    discountPercent,
    stock: row.stockQuantity ?? 1000,
    lowStockThreshold: row.lowStockThreshold ?? 10,
    stockUnit: row.unit ?? 'عبوة',
    isActive: row.isActive ?? true,
    isBestSeller: row.isFeatured ?? false,
    isDailyOffer: row.isDailyOffer ?? false,
    badgeText: row.badgeText ?? undefined,
    weights,
  };
}

export function mapOrder(id: string, row: FirestoreOrderDoc): Order {
  const items = row.items ?? [];
  return {
    id,
    orderNumber: row.orderNumber,
    code: row.code,
    customerId: row.userId,
    customerName: row.customerNameSnapshot,
    customerArea: row.customerAreaSnapshot,
    customerAddress: row.addressSnapshot,
    itemsCount: items.reduce((sum, i) => sum + i.quantity, 0),
    items: items.map((item) => ({
      productId: item.productId,
      name: item.name,
      unitLabel: item.unitLabel,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      imageKey: item.imageKey ?? 'local://logo',
    })),
    subtotal: row.subtotal,
    deliveryFee: row.deliveryFee,
    freeDeliveryThreshold: row.freeDeliveryThreshold ?? undefined,
    discount: row.discount,
    total: row.total,
    promoCode: row.promoCode ?? undefined,
    deliverySlot: row.deliverySlot ?? 'instant',
    paymentMethod: row.paymentMethod ?? 'cod',
    paymentStatus: row.paymentStatus ?? 'cod',
    status: row.status,
    courierName: row.courierName ?? undefined,
    courierPhone: row.courierPhone ?? undefined,
    etaMinutes: row.etaMinutes ?? undefined,
    placedAt: row.placedAt,
    deliveredAt: row.deliveredAt ?? null,
    createdAt: row.placedAt,
    statusHistory: row.statusHistory ?? [],
  };
}

export function mapAddress(id: string, row: Omit<Address, 'id'>): Address {
  return {
    id,
    label: row.label,
    governorate: row.governorate,
    city: row.city,
    area: row.area,
    street: row.street,
    building: row.building ?? null,
    floor: row.floor ?? null,
    apartment: row.apartment ?? null,
    landmark: row.landmark ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    isDefault: row.isDefault,
    deliveryNotes: row.deliveryNotes ?? null,
  };
}

export function mapCustomer(
  id: string,
  row: FirestoreUserDoc,
  userOrders: { total: number; status: OrderStatus; code: string }[],
): User {
  const totalSpent = Number(
    userOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total, 0)
      .toFixed(2),
  );
  return {
    id,
    firebaseUid: row.firebaseUid,
    name: row.fullName,
    phone: row.phone ?? 'غير مسجل',
    email: sanitizePublicEmail(row.email),
    role: row.role,
    status: row.isActive ? 'active' : 'suspended',
    isActive: row.isActive,
    avatarKey: row.avatarUrl ?? 'avatar-ahmed',
    area: row.area || 'الإسكندرية',
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    ordersCount: userOrders.length,
    totalSpent,
    lastOrderCode: userOrders[0]?.code,
    createdAt: row.createdAt ?? new Date().toISOString(),
  };
}

export function mapNotification(id: string, row: FirestoreNotificationDoc): NotificationItem {
  return {
    id,
    title: row.title,
    body: row.body,
    relativeTime: formatRelativeArabic(row.createdAt),
    createdAt: row.createdAt,
    isRead: row.isRead,
    type: row.type,
    dataPayload: row.dataPayload ?? null,
  };
}
