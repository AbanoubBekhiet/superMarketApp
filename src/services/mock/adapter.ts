import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { OrderStatus, User, UserAccountStatus, UserRole } from '@/types/domain';
import { mobileMockDb } from './db';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ok<T>(config: InternalAxiosRequestConfig, data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config,
  };
}

function fail(config: InternalAxiosRequestConfig, message: string, status = 400): never {
  const error = new Error(message) as Error & {
    response?: { status: number; data: { message: string } };
    config?: InternalAxiosRequestConfig;
    isAxiosError?: boolean;
  };
  error.isAxiosError = true;
  error.config = config;
  error.response = { status, data: { message } };
  throw error;
}

function parseBody<T>(raw: unknown): T {
  if (typeof raw === 'string') {
    return JSON.parse(raw) as T;
  }
  return (raw ?? {}) as T;
}

export const mobileMockAdapter: AxiosAdapter = async (config) => {
  await wait(140);

  const method = (config.method ?? 'get').toLowerCase();
  const rawUrl = config.url ?? '/';
  const [pathPart, queryPart] = rawUrl.split('?');
  const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  const params = new URLSearchParams(queryPart ?? '');
  const queryParams = config.params as Record<string, string | undefined> | undefined;
  if (queryParams) {
    Object.entries(queryParams).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
  }

  // Auth
  if (method === 'post' && path === '/auth/login') {
    const body = parseBody<{ identifier: string; password: string; role?: UserRole }>(config.data);
    const identifier = body.identifier.trim().toLowerCase();
    const matched = mobileMockDb.users.find(
      (u) =>
        u.email.toLowerCase() === identifier ||
        u.phone.replace(/\s+/g, '') === identifier.replace(/\s+/g, ''),
    );
    if (body.password.length < 6) {
      fail(config, 'كلمة المرور غير صحيحة', 401);
    }
    const user: User =
      matched ??
      (body.role === 'admin'
        ? mobileMockDb.users.find((u) => u.role === 'admin')!
        : mobileMockDb.users[0]);
    return ok(config, { user, token: `mock-token-${user.id}` });
  }

  if (method === 'post' && path === '/auth/register') {
    const body = parseBody<{ name: string; phone: string; email: string; area: string }>(
      config.data,
    );
    const created: User = {
      id: `usr-${Date.now()}`,
      name: body.name,
      phone: body.phone,
      email: body.email,
      role: 'user',
      status: 'active',
      avatarKey: 'avatar-ahmed',
      area: body.area,
      ordersCount: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
    };
    mobileMockDb.users = [created, ...mobileMockDb.users];
    return ok(config, { user: created, token: `mock-token-${created.id}` }, 201);
  }

  // Products
  if (method === 'get' && path === '/products') {
    const categoryId = params.get('categoryId');
    const subcategoryId = params.get('subcategoryId');
    const search = (params.get('search') ?? '').trim().toLowerCase();
    const sort = params.get('sort') ?? 'default';

    let items = mobileMockDb.products.filter((p) => {
      if (categoryId && categoryId !== 'all' && p.categoryId !== categoryId) return false;
      if (subcategoryId && subcategoryId !== 'all' && p.subcategoryId !== subcategoryId) {
        return false;
      }
      if (search) {
        const hit =
          p.name.toLowerCase().includes(search) ||
          p.brand.toLowerCase().includes(search) ||
          p.categoryName.toLowerCase().includes(search);
        if (!hit) return false;
      }
      return true;
    });

    if (sort === 'price_asc') items = [...items].sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') items = [...items].sort((a, b) => b.price - a.price);
    if (sort === 'offers') {
      items = [...items].sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0));
    }

    return ok(config, items);
  }

  if (method === 'get' && path.startsWith('/products/')) {
    const id = path.replace('/products/', '');
    const product = mobileMockDb.products.find((p) => p.id === id);
    if (!product) fail(config, 'المنتج غير موجود', 404);
    return ok(config, product);
  }

  if (method === 'post' && path === '/products') {
    const body = parseBody<{ name: string; price: number; stock: number; categoryId?: string }>(
      config.data,
    );
    return ok(config, mobileMockDb.createProduct(body), 201);
  }

  if (method === 'patch' && path.startsWith('/products/')) {
    const id = path.replace('/products/', '');
    const body = parseBody<{ name?: string; price?: number; stock?: number; categoryId?: string }>(
      config.data,
    );
    const updated = mobileMockDb.updateProduct(id, body);
    if (!updated) fail(config, 'المنتج غير موجود', 404);
    return ok(config, updated);
  }

  if (method === 'delete' && path.startsWith('/products/')) {
    const id = path.replace('/products/', '');
    mobileMockDb.deleteProduct(id);
    return ok(config, { success: true });
  }

  // Categories
  if (method === 'get' && path === '/categories') {
    return ok(config, mobileMockDb.categories);
  }

  if (method === 'post' && path === '/categories') {
    const body = parseBody<{ name: string; isActive: boolean }>(config.data);
    return ok(config, mobileMockDb.createCategory(body), 201);
  }

  if (method === 'patch' && path.startsWith('/categories/')) {
    const id = path.replace('/categories/', '');
    const body = parseBody<{ name?: string; isActive?: boolean }>(config.data);
    const updated = mobileMockDb.updateCategory(id, body);
    if (!updated) fail(config, 'القسم غير موجود', 404);
    return ok(config, updated);
  }

  if (method === 'delete' && path.startsWith('/categories/')) {
    const id = path.replace('/categories/', '');
    mobileMockDb.deleteCategory(id);
    return ok(config, { success: true });
  }

  // Orders
  if (method === 'get' && path === '/orders') {
    const customerId = params.get('customerId');
    const status = params.get('status');
    const list = mobileMockDb.orders.filter((o) => {
      if (customerId && o.customerId !== customerId) return false;
      if (status && status !== 'all' && o.status !== status) return false;
      return true;
    });
    return ok(config, list);
  }

  if (method === 'post' && path === '/orders') {
    const body = parseBody<Parameters<typeof mobileMockDb.createOrder>[0]>(config.data);
    return ok(config, mobileMockDb.createOrder(body), 201);
  }

  if (method === 'patch' && path.endsWith('/status')) {
    const id = path.replace('/orders/', '').replace('/status', '');
    const body = parseBody<{ status: OrderStatus }>(config.data);
    const updated = mobileMockDb.updateOrderStatus(id, body.status);
    if (!updated) fail(config, 'الطلب غير موجود', 404);
    return ok(config, updated);
  }

  // Customers & Profile
  if (method === 'get' && path === '/customers') {
    return ok(
      config,
      mobileMockDb.users.filter((u) => u.role === 'user'),
    );
  }

  if (method === 'patch' && path.startsWith('/customers/') && path.endsWith('/status')) {
    const id = path.replace('/customers/', '').replace('/status', '');
    const body = parseBody<{ status: UserAccountStatus }>(config.data);
    const updated = mobileMockDb.updateCustomerStatus(id, body.status);
    if (!updated) fail(config, 'العميل غير موجود', 404);
    return ok(config, updated);
  }

  if (method === 'get' && path === '/addresses') {
    return ok(config, mobileMockDb.addresses);
  }

  if (method === 'post' && path === '/addresses') {
    const body = parseBody<Parameters<typeof mobileMockDb.addAddress>[0]>(config.data);
    return ok(config, mobileMockDb.addAddress(body), 201);
  }

  if (method === 'patch' && path.startsWith('/addresses/') && path.endsWith('/default')) {
    const id = path.replace('/addresses/', '').replace('/default', '');
    return ok(config, mobileMockDb.setDefaultAddress(id));
  }

  if (method === 'get' && path === '/notifications') {
    return ok(config, mobileMockDb.notifications);
  }

  if (method === 'post' && path === '/notifications/read-all') {
    return ok(config, mobileMockDb.markAllNotificationsRead());
  }

  if (method === 'get' && path === '/dashboard/overview') {
    return ok(config, mobileMockDb.getOverview());
  }

  fail(config, 'المسار غير مدعوم في المحاكاة', 404);
};
