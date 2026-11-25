import {
  adminListAllProducts,
  getProductById,
  listActiveProducts,
} from '@/dataconnect-generated';
import { callFunction, dataConnect } from '@/services/firebase/app';
import { mapProduct } from '@/services/firebase/mappers';
import { useAuthStore } from '@/store/authStore';
import type { Product } from '@/types/domain';

export interface ProductsFilterParams {
  categoryId?: string;
  subcategoryId?: string;
  search?: string;
  sort?: 'default' | 'price_asc' | 'price_desc' | 'offers';
}

export interface QuickProductPayload {
  name: string;
  price: number;
  stock: number;
  categoryId?: string;
}

export async function fetchProducts(params: ProductsFilterParams = {}): Promise<Product[]> {
  const role = useAuthStore.getState().user?.role;
  const isStaff = role === 'admin' || role === 'sub_admin';
  const categoryVar =
    params.categoryId && params.categoryId !== 'all' ? params.categoryId : undefined;

  const rawProducts = isStaff
    ? (await adminListAllProducts(dataConnect, { categoryId: categoryVar })).data.products
    : (await listActiveProducts(dataConnect, { categoryId: categoryVar })).data.products;

  let items = rawProducts.map(mapProduct);

  if (params.subcategoryId && params.subcategoryId !== 'all') {
    const subFiltered = items.filter((p) => p.subcategoryId === params.subcategoryId);
    if (subFiltered.length > 0) items = subFiltered;
  }

  const search = params.search?.trim().toLowerCase();
  if (search) {
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.brand.toLowerCase().includes(search) ||
        p.categoryName.toLowerCase().includes(search) ||
        p.sku.toLowerCase().includes(search),
    );
  }

  if (params.sort === 'price_asc') items = [...items].sort((a, b) => a.price - b.price);
  if (params.sort === 'price_desc') items = [...items].sort((a, b) => b.price - a.price);
  if (params.sort === 'offers') {
    items = [...items].sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0));
  }

  return items;
}

export async function fetchProductById(id: string): Promise<Product> {
  const { data } = await getProductById(dataConnect, { id });
  if (!data.product || data.product.deletedAt) {
    throw new Error('المنتج غير موجود');
  }
  return mapProduct(data.product);
}

export async function createProduct(payload: QuickProductPayload): Promise<Product> {
  const cats = await fetchProducts({});
  const fallbackCategoryId = payload.categoryId ?? cats[0]?.categoryId;
  if (!fallbackCategoryId) throw new Error('يرجى اختيار قسم');

  const sku = `طز-${Math.floor(1000 + Math.random() * 9000)}`;
  const { id } = await callFunction<Record<string, unknown>, { id: string }>('upsertProduct', {
    categoryId: fallbackCategoryId,
    name: payload.name,
    sku,
    price: payload.price,
    stockQuantity: payload.stock,
    unit: 'عبوة',
    imageUrl: 'local://prod-tomatoes',
    isActive: true,
  });
  return fetchProductById(id);
}

export async function updateProduct(
  id: string,
  payload: Partial<QuickProductPayload>,
): Promise<Product> {
  const current = await fetchProductById(id);
  await callFunction<Record<string, unknown>, { id: string }>('upsertProduct', {
    id,
    categoryId: payload.categoryId ?? current.categoryId,
    name: payload.name ?? current.name,
    sku: current.sku,
    price: payload.price ?? current.price,
    stockQuantity: payload.stock ?? current.stock,
    unit: current.stockUnit,
    imageUrl: current.imageKey,
    isActive: current.isActive ?? true,
  });
  return fetchProductById(id);
}

export async function deleteProduct(id: string): Promise<void> {
  await callFunction<{ id: string }, { deleted: boolean }>('softDeleteProduct', { id });
}
