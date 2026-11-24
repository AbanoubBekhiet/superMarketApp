import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Product } from '@/types/domain';
import {
  createProduct,
  deleteProduct,
  fetchProductById,
  fetchProducts,
  updateProduct,
  type ProductsFilterParams,
  type QuickProductPayload,
} from '../api/productsApi';

export const productKeys = {
  all: ['products'] as const,
  list: (params: ProductsFilterParams) => ['products', params] as const,
  detail: (id: string) => ['products', 'detail', id] as const,
};

export function useProducts(params: ProductsFilterParams = {}) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => fetchProducts(params),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => fetchProductById(id),
    enabled: Boolean(id),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: QuickProductPayload) => createProduct(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<QuickProductPayload> }) =>
      updateProduct(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: productKeys.all });
      const previous = qc.getQueriesData<Product[]>({ queryKey: productKeys.all });
      qc.setQueriesData<Product[]>({ queryKey: productKeys.all }, (old) =>
        old?.filter((p) => p.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      ctx?.previous.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}
