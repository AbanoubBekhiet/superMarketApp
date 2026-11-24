import type {
  Address,
  Category,
  DashboardOverview,
  NotificationItem,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  DeliveryTimeSlot,
  Product,
  User,
  UserAccountStatus,
} from '@/types/domain';
import {
  INITIAL_ADDRESSES,
  INITIAL_CATEGORIES,
  INITIAL_DASHBOARD_OVERVIEW,
  INITIAL_NOTIFICATIONS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_USERS,
} from './data';

class MobileMockDatabase {
  users: User[] = [...INITIAL_USERS];
  addresses: Address[] = [...INITIAL_ADDRESSES];
  categories: Category[] = [...INITIAL_CATEGORIES];
  products: Product[] = [...INITIAL_PRODUCTS];
  orders: Order[] = [...INITIAL_ORDERS];
  notifications: NotificationItem[] = [...INITIAL_NOTIFICATIONS];

  getOverview(): DashboardOverview {
    const activeOrders = this.orders.filter(
      (o) => o.status === 'pending' || o.status === 'processing' || o.status === 'on_the_way',
    );
    const processingOrders = this.orders.filter((o) => o.status === 'processing');
    return {
      ...INITIAL_DASHBOARD_OVERVIEW,
      activeOrdersCount: Math.max(38, activeOrders.length + 35),
      processingOrdersCount: Math.max(12, processingOrders.length + 11),
      totalProductsCount: 1240 + (this.products.length - INITIAL_PRODUCTS.length),
      totalCategoriesCount: this.categories.length,
      totalCustomersCount: 2418 + (this.users.filter((u) => u.role === 'user').length - 4),
    };
  }

  createOrder(input: {
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
  }): Order {
    const codeNumber = 4822 + this.orders.length;
    const order: Order = {
      id: `ord-${codeNumber}`,
      code: `#طز-${codeNumber}`,
      customerId: input.customerId,
      customerName: input.customerName,
      customerArea: input.customerArea,
      customerAddress: input.customerAddress,
      itemsCount: input.items.reduce((sum, item) => sum + item.quantity, 0),
      items: input.items,
      subtotal: input.subtotal,
      deliveryFee: input.deliveryFee,
      discount: input.discount,
      total: input.total,
      promoCode: input.promoCode,
      deliverySlot: input.deliverySlot,
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentMethod === 'cod' ? 'cod' : 'paid',
      status: 'processing',
      courierName: 'كريم محمود',
      courierPhone: '+20 100 555 2190',
      etaMinutes: 35,
      createdAt: new Date().toISOString(),
    };
    this.orders = [order, ...this.orders];
    return order;
  }

  updateOrderStatus(orderId: string, status: OrderStatus): Order | null {
    const idx = this.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return null;
    this.orders[idx] = { ...this.orders[idx], status };
    return this.orders[idx];
  }

  createProduct(input: {
    name: string;
    price: number;
    stock: number;
    categoryId?: string;
  }): Product {
    const category =
      this.categories.find((c) => c.id === input.categoryId) ?? this.categories[0];
    const id = `prd-${Date.now()}`;
    const created: Product = {
      id,
      sku: `طز-${Math.floor(500 + Math.random() * 400)}`,
      name: input.name,
      brand: 'طازج المختار',
      categoryId: category.id,
      categoryName: category.name,
      description: `${input.name} طازج ومختار بعناية يومياً من متجر طازج.`,
      imageKey: 'prod-milk',
      unitLabel: '1 عبوة',
      price: input.price,
      stock: input.stock,
      stockUnit: 'عبوة',
      weights: [{ id: `w-${id}`, label: '1 عبوة', price: input.price }],
    };
    this.products = [created, ...this.products];
    return created;
  }

  updateProduct(
    productId: string,
    input: Partial<Pick<Product, 'name' | 'price' | 'stock' | 'categoryId'>>,
  ): Product | null {
    const idx = this.products.findIndex((p) => p.id === productId);
    if (idx === -1) return null;
    this.products[idx] = { ...this.products[idx], ...input };
    return this.products[idx];
  }

  deleteProduct(productId: string): boolean {
    const len = this.products.length;
    this.products = this.products.filter((p) => p.id !== productId);
    return this.products.length < len;
  }

  createCategory(input: { name: string; isActive: boolean }): Category {
    const created: Category = {
      id: `cat-${Date.now()}`,
      name: input.name,
      imageKey: 'cat-vegetables',
      productCount: 0,
      isActive: input.isActive,
      subcategories: [],
    };
    this.categories = [created, ...this.categories];
    return created;
  }

  updateCategory(
    categoryId: string,
    input: Partial<Pick<Category, 'name' | 'isActive'>>,
  ): Category | null {
    const idx = this.categories.findIndex((c) => c.id === categoryId);
    if (idx === -1) return null;
    this.categories[idx] = { ...this.categories[idx], ...input };
    return this.categories[idx];
  }

  deleteCategory(categoryId: string): boolean {
    const len = this.categories.length;
    this.categories = this.categories.filter((c) => c.id !== categoryId);
    return this.categories.length < len;
  }

  updateCustomerStatus(userId: string, status: UserAccountStatus): User | null {
    const idx = this.users.findIndex((u) => u.id === userId);
    if (idx === -1) return null;
    this.users[idx] = { ...this.users[idx], status };
    return this.users[idx];
  }

  addAddress(input: Omit<Address, 'id'>): Address {
    const created: Address = { ...input, id: `addr-${Date.now()}` };
    if (created.isDefault) {
      this.addresses = this.addresses.map((a) => ({ ...a, isDefault: false }));
    }
    this.addresses = [created, ...this.addresses];
    return created;
  }

  setDefaultAddress(addressId: string): Address[] {
    this.addresses = this.addresses.map((a) => ({
      ...a,
      isDefault: a.id === addressId,
    }));
    return this.addresses;
  }

  markAllNotificationsRead(): NotificationItem[] {
    this.notifications = this.notifications.map((n) => ({ ...n, isRead: true }));
    return this.notifications;
  }
}

export const mobileMockDb = new MobileMockDatabase();
