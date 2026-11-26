import { addDoc, collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { uploadEntityImageUri } from '@/lib/imageUpload';
import { deleteStorageImage, firestoreDb } from '@/services/firebase/app';
import { mapCategories, type FirestoreCategoryDoc } from '@/services/firebase/mappers';
import { useAuthStore } from '@/store/authStore';
import type { Category } from '@/types/domain';

export function reserveCategoryId(): string {
  return doc(collection(firestoreDb, 'categories')).id;
}

export async function uploadCategoryImageFromUri(
  categoryId: string,
  uri: string,
  mimeType = 'image/jpeg',
  base64?: string | null,
): Promise<string> {
  return uploadEntityImageUri({
    folder: 'categories',
    suffix: 'cat',
    entityId: categoryId,
    uri,
    mimeType,
    base64,
  });
}

export async function fetchCategories(): Promise<Category[]> {
  const role = useAuthStore.getState().user?.role;
  const isStaff = role === 'admin' || role === 'sub_admin';

  const [catSnap, prodSnap] = await Promise.all([
    getDocs(collection(firestoreDb, 'categories')),
    getDocs(collection(firestoreDb, 'products')),
  ]);

  const productCounts = new Map<string, number>();
  prodSnap.docs.forEach((d) => {
    const p = d.data() as { categoryId?: string; deletedAt?: string | null; isActive?: boolean };
    if (!p.deletedAt && p.categoryId && (isStaff || p.isActive !== false)) {
      productCounts.set(p.categoryId, (productCounts.get(p.categoryId) ?? 0) + 1);
    }
  });

  const rows = catSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as FirestoreCategoryDoc) }))
    .filter((c) => !c.deletedAt && (isStaff || c.isActive !== false));

  return mapCategories(rows, productCounts);
}

export async function createCategory(payload: {
  id?: string;
  name: string;
  isActive: boolean;
  imageUrl?: string | null;
}): Promise<Category> {
  const now = new Date().toISOString();
  const imageUrl = payload.imageUrl ?? 'local://logo';
  const docData = {
    name: payload.name.trim(),
    isActive: payload.isActive,
    parentId: null,
    imageUrl,
    sortOrder: 0,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const targetId = payload.id?.trim();
  let createdId: string;
  if (targetId) {
    await setDoc(doc(firestoreDb, 'categories', targetId), docData);
    createdId = targetId;
  } else {
    const ref = await addDoc(collection(firestoreDb, 'categories'), docData);
    createdId = ref.id;
  }

  return {
    id: createdId,
    parentId: null,
    name: payload.name.trim(),
    imageKey: imageUrl,
    productCount: 0,
    sortOrder: 0,
    isActive: payload.isActive,
    subcategories: [],
  };
}

export async function updateCategory(
  id: string,
  payload: Partial<{ name: string; isActive: boolean; imageUrl: string | null }>,
): Promise<Category> {
  const ref = doc(firestoreDb, 'categories', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('القسم غير موجود');

  const data = snap.data() as FirestoreCategoryDoc;

  await updateDoc(ref, {
    ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
    ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
    ...(payload.imageUrl !== undefined ? { imageUrl: payload.imageUrl } : {}),
    updatedAt: new Date().toISOString(),
  });

  if (payload.imageUrl !== undefined && data.imageUrl && payload.imageUrl !== data.imageUrl) {
    void deleteStorageImage(data.imageUrl).catch(() => undefined);
  }

  const updated = (await fetchCategories()).find((c) => c.id === id);
  if (updated) return updated;
  return {
    id,
    parentId: data.parentId ?? null,
    name: payload.name ?? data.name,
    imageKey: payload.imageUrl ?? data.imageUrl ?? 'local://logo',
    productCount: 0,
    sortOrder: data.sortOrder ?? 0,
    isActive: payload.isActive ?? data.isActive ?? true,
    subcategories: [],
  };
}

export async function deleteCategory(id: string): Promise<void> {
  const ref = doc(firestoreDb, 'categories', id);
  const snap = await getDoc(ref);
  const previousImageUrl = snap.exists() ? (snap.data() as FirestoreCategoryDoc).imageUrl : null;

  await updateDoc(ref, {
    deletedAt: new Date().toISOString(),
    isActive: false,
    updatedAt: new Date().toISOString(),
  });

  if (previousImageUrl) {
    void deleteStorageImage(previousImageUrl).catch(() => undefined);
  }
}
