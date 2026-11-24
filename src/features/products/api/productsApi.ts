import { apiClient } from '@/services/api/client';
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
  const { data } = await apiClient.get<Product[]>('/products', { params });
  return data;
}

export async function fetchProductById(id: string): Promise<Product> {
  const { data } = await apiClient.get<Product>(`/products/${id}`);
  return data;
}

export async function createProduct(payload: QuickProductPayload): Promise<Product> {
  const { data } = await apiClient.post<Product>('/products', payload);
  return data;
}

export async function updateProduct(
  id: string,
  payload: Partial<QuickProductPayload>,
): Promise<Product> {
  const { data } = await apiClient.patch<Product>(`/products/${id}`, payload);
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  await apiClient.delete(`/products/${id}`);
}
