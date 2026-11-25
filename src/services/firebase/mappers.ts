import type {
  AdminListAllCategoriesData,
  AdminListAllProductsData,
  AdminListCustomersData,
  AdminListOrdersData,
  ListActiveCategoriesData,
  ListActiveProductsData,
  ListMyAddressesData,
  ListMyNotificationsData,
  ListMyOrdersData,
} from '@/dataconnect-generated';
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
  User,
} from '@/types/domain';

export function formatRelativeArabic(iso: string): string {
  const diffMin = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  const diffDays = Math.round(diffHours / 24);
  return `منذ ${diffDays} يوم`;
}

export function mapCategories(
  rows:
    | ListActiveCategoriesData['categories']
    | AdminListAllCategoriesData['categories'],
): Category[] {
  const parents = rows.filter((r) => !r.parentId);
  const children = rows.filter((r) => Boolean(r.parentId));

  return parents.map((parent) => {
    const prodCount =
      'products_on_category' in parent && Array.isArray(parent.products_on_category)
        ? parent.products_on_category.length
        : 0;
    return {
      id: parent.id,
      parentId: null,
      name: parent.name,
      slug: parent.slug,
      imageKey: parent.imageUrl ?? 'cat-vegetables',
      productCount: prodCount,
      sortOrder: parent.sortOrder,
      isActive: parent.isActive,
      subcategories: children
        .filter((c) => c.parentId === parent.id)
        .map((sub) => ({
          id: sub.id,
          categoryId: parent.id,
          name: sub.name,
          isActive: sub.isActive,
        })),
    };
  });
}

export function mapProduct(
  row:
    | ListActiveProductsData['products'][number]
    | AdminListAllProductsData['products'][number],
): Product {
  const effectivePrice = row.salePrice ?? row.price;
  const oldPrice = row.salePrice ? row.price : undefined;
  const discountPercent =
    oldPrice && oldPrice > effectivePrice
      ? Math.round(((oldPrice - effectivePrice) / oldPrice) * 100)
      : undefined;

  return {
    id: row.id,
    sku: row.sku,
    barcode: row.barcode ?? null,
    name: row.name,
    brand: row.brand,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    description: row.description,
    imageKey: row.productImages_on_product[0]?.imageUrl ?? 'prod-tomatoes',
    unitLabel: row.unit,
    price: effectivePrice,
    oldPrice,
    discountPercent,
    stock: row.stockQuantity,
    lowStockThreshold: row.lowStockThreshold,
    stockUnit: row.unit,
    isActive: row.isActive,
    isBestSeller: row.isFeatured,
    isDailyOffer: row.isDailyOffer,
    badgeText: row.badgeText ?? undefined,
    weights: row.productWeights_on_product.map((w) => ({
      id: w.id,
      label: w.label,
      price: w.salePrice ?? w.price,
      oldPrice: w.salePrice ? w.price : undefined,
    })),
  };
}

export function mapCustomerOrder(row: ListMyOrdersData['orders'][number]): Order {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    code: row.code,
    customerId: '',
    customerName: row.customerNameSnapshot,
    customerArea: row.customerAreaSnapshot,
    customerAddress: row.addressSnapshot,
    itemsCount: row.orderItems_on_order.reduce((sum, i) => sum + i.quantity, 0),
    items: row.orderItems_on_order.map((item) => ({
      productId: item.productId ?? item.id,
      name: item.productName,
      unitLabel: item.unitLabel,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      imageKey: item.imageUrl ?? 'prod-tomatoes',
    })),
    subtotal: row.subtotal,
    deliveryFee: row.deliveryFee,
    discount: row.discount,
    total: row.total,
    deliverySlot: row.deliverySlot as DeliveryTimeSlot,
    paymentMethod: row.paymentMethod as PaymentMethod,
    paymentStatus: row.paymentStatus as PaymentStatus,
    status: row.status as OrderStatus,
    courierName: row.courierName ?? undefined,
    courierPhone: row.courierPhone ?? undefined,
    etaMinutes: row.etaMinutes ?? undefined,
    placedAt: row.placedAt,
    deliveredAt: row.deliveredAt ?? null,
    createdAt: row.placedAt,
    statusHistory: row.orderStatusHistories_on_order.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus ?? null,
      toStatus: h.toStatus as OrderStatus,
      note: h.note ?? null,
      createdAt: h.createdAt,
    })),
  };
}

export function mapAdminOrder(row: AdminListOrdersData['orders'][number]): Order {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    code: row.code,
    customerId: row.userId,
    customerName: row.customerNameSnapshot,
    customerArea: row.customerAreaSnapshot,
    customerAddress: row.addressSnapshot,
    itemsCount: row.orderItems_on_order.reduce((sum, i) => sum + i.quantity, 0),
    items: row.orderItems_on_order.map((item) => ({
      productId: item.productId ?? item.id,
      name: item.productName,
      unitLabel: item.unitLabel,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      imageKey: item.imageUrl ?? 'prod-tomatoes',
    })),
    subtotal: row.subtotal,
    deliveryFee: row.deliveryFee,
    discount: row.discount,
    total: row.total,
    deliverySlot: row.deliverySlot as DeliveryTimeSlot,
    paymentMethod: row.paymentMethod as PaymentMethod,
    paymentStatus: row.paymentStatus as PaymentStatus,
    status: row.status as OrderStatus,
    courierName: row.courierName ?? undefined,
    courierPhone: row.courierPhone ?? undefined,
    etaMinutes: row.etaMinutes ?? undefined,
    placedAt: row.placedAt,
    deliveredAt: row.deliveredAt ?? null,
    createdAt: row.placedAt,
    statusHistory: row.orderStatusHistories_on_order.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus ?? null,
      toStatus: h.toStatus as OrderStatus,
      note: h.note ?? null,
      changedByName: h.changedBy?.fullName ?? null,
      createdAt: h.createdAt,
    })),
  };
}

export function mapAddress(row: ListMyAddressesData['userAddresses'][number]): Address {
  return {
    id: row.id,
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

export function mapCustomer(row: AdminListCustomersData['users'][number]): User {
  const orders = row.orders_on_user ?? [];
  const totalSpent = Number(
    orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total, 0)
      .toFixed(2),
  );
  return {
    id: row.id,
    firebaseUid: row.firebaseUid,
    name: row.fullName,
    phone: row.phone ?? 'غير مسجل',
    email: row.email ?? '',
    role: row.role as User['role'],
    status: row.isActive ? 'active' : 'suspended',
    isActive: row.isActive,
    avatarKey: row.avatarUrl ?? 'avatar-ahmed',
    area: row.area || 'الإسكندرية',
    ordersCount: orders.length,
    totalSpent,
    lastOrderCode: orders[0]?.code,
    createdAt: row.createdAt,
  };
}

export function mapNotification(row: ListMyNotificationsData['notifications'][number]): NotificationItem {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    relativeTime: formatRelativeArabic(row.createdAt),
    createdAt: row.createdAt,
    isRead: row.isRead,
    type: row.type as NotificationItem['type'],
    dataPayload: row.dataPayload ?? null,
  };
}
