import { adminListAllCategories, listActiveCategories } from '@/dataconnect-generated';
import { callFunction, dataConnect } from '@/services/firebase/app';
import { mapCategories } from '@/services/firebase/mappers';
import { useAuthStore } from '@/store/authStore';
import type { Category } from '@/types/domain';

export async function fetchCategories(): Promise<Category[]> {
  const role = useAuthStore.getState().user?.role;
  const isStaff = role === 'admin' || role === 'sub_admin';

  if (isStaff) {
    const { data } = await adminListAllCategories(dataConnect);
    return mapCategories(data.categories);
  }
  const { data } = await listActiveCategories(dataConnect);
  return mapCategories(data.categories);
}

function sameUuid(a: string, b: string): boolean {
  return a.replace(/-/g, '').toLowerCase() === b.replace(/-/g, '').toLowerCase();
}

export async function createCategory(payload: {
  name: string;
  isActive: boolean;
}): Promise<Category> {
  const { id } = await callFunction<Record<string, unknown>, { id: string }>('upsertCategory', {
    name: payload.name,
    isActive: payload.isActive,
    imageUrl: 'local://cat-vegetables',
  });
  const list = await fetchCategories();
  const created = list.find((c) => sameUuid(c.id, id));
  if (created) return created;
  return {
    id: id.replace(/-/g, ''),
    parentId: null,
    name: payload.name,
    imageKey: 'local://cat-vegetables',
    productCount: 0,
    sortOrder: 0,
    isActive: payload.isActive,
    subcategories: [],
  };
}

export async function updateCategory(
  id: string,
  payload: Partial<{ name: string; isActive: boolean }>,
): Promise<Category> {
  const list = await fetchCategories();
  const current = list.find((c) => sameUuid(c.id, id));
  if (!current) throw new Error('القسم غير موجود');

  await callFunction<Record<string, unknown>, { id: string }>('upsertCategory', {
    id: current.id,
    name: payload.name ?? current.name,
    isActive: payload.isActive ?? current.isActive,
    imageUrl: current.imageKey,
    sortOrder: current.sortOrder ?? 0,
  });

  const updated = (await fetchCategories()).find((c) => sameUuid(c.id, id));
  return updated ?? { ...current, ...payload };
}

export async function deleteCategory(id: string): Promise<void> {
  await callFunction<{ id: string }, { deleted: boolean }>('softDeleteCategory', { id });
}
