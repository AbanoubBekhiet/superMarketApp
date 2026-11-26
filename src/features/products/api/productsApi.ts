import { addDoc, collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { uploadEntityImageUri } from '@/lib/imageUpload';
import { deleteStorageImage, firestoreDb } from '@/services/firebase/app';
import { mapProduct, type FirestoreProductDoc } from '@/services/firebase/mappers';
import { useAuthStore } from '@/store/authStore';
import type { Product } from '@/types/domain';

export interface ProductsFilterParams {
  categoryId?: string;
  subcategoryId?: string;
  search?: string;
  sort?: 'default' | 'price_asc' | 'price_desc' | 'offers';
}

export interface QuickProductPayload {
  id?: string;
  name: string;
  price: number;
  stock?: number;
  categoryId?: string;
  imageUrl?: string | null;
}

export function reserveProductId(): string {
  return doc(collection(firestoreDb, 'products')).id;
}

export async function uploadProductImageFromUri(
  productId: string,
  uri: string,
  mimeType = 'image/jpeg',
  base64?: string | null,
): Promise<string> {
  return uploadEntityImageUri({
    folder: 'products',
    suffix: 'prod',
    entityId: productId,
    uri,
    mimeType,
    base64,
    requireEntityId: true,
  });
}

export async function fetchProducts(params: ProductsFilterParams = {}): Promise<Product[]> {
  const role = useAuthStore.getState().user?.role;
  const isStaff = role === 'admin' || role === 'sub_admin';

  const [prodSnap, catSnap] = await Promise.all([
    getDocs(collection(firestoreDb, 'products')),
    getDocs(collection(firestoreDb, 'categories')),
  ]);

  const categoryMap = new Map<string, string>();
  catSnap.docs.forEach((d) => {
    const data = d.data() as { name?: string };
    if (data.name) categoryMap.set(d.id, data.name);
  });

  let items = prodSnap.docs
    .map((d) => ({ id: d.id, data: d.data() as FirestoreProductDoc }))
    .filter(({ data }) => !data.deletedAt && (isStaff || data.isActive !== false))
    .map(({ id, data }) => mapProduct(id, data, categoryMap));

  if (params.categoryId && params.categoryId !== 'all') {
    items = items.filter((p) => p.categoryId === params.categoryId);
  }

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
  const [snap, catSnap] = await Promise.all([
    getDoc(doc(firestoreDb, 'products', id)),
    getDocs(collection(firestoreDb, 'categories')),
  ]);
  if (!snap.exists()) {
    throw new Error('المنتج غير موجود');
  }
  const data = snap.data() as FirestoreProductDoc;
  if (data.deletedAt) {
    throw new Error('المنتج غير موجود');
  }
  const categoryMap = new Map<string, string>();
  catSnap.docs.forEach((d) => {
    const catData = d.data() as { name?: string };
    if (catData.name) categoryMap.set(d.id, catData.name);
  });

  return mapProduct(snap.id, data, categoryMap);
}

export async function createProduct(payload: QuickProductPayload): Promise<Product> {
  const cats = await getDocs(collection(firestoreDb, 'categories'));
  const fallbackCategoryId = payload.categoryId ?? cats.docs[0]?.id;
  if (!fallbackCategoryId) throw new Error('يرجى اختيار قسم');

  const catDoc = cats.docs.find((c) => c.id === fallbackCategoryId);
  const categoryName = (catDoc?.data() as { name?: string } | undefined)?.name ?? '';
  const now = new Date().toISOString();
  const sku = `طز-${Math.floor(1000 + Math.random() * 9000)}`;

  const docPayload = {
    categoryId: fallbackCategoryId,
    categoryName,
    name: payload.name.trim(),
    sku,
    brand: 'مزارع طازج',
    description: '',
    price: payload.price,
    salePrice: null,
    stockQuantity: payload.stock ?? 1000,
    lowStockThreshold: 10,
    unit: 'عبوة',
    imageUrl: payload.imageUrl ?? 'local://logo',
    isActive: true,
    isFeatured: false,
    isDailyOffer: false,
    weights: [
      {
        id: `w-${Date.now()}`,
        label: 'عبوة',
        price: payload.price,
        salePrice: null,
        sortOrder: 0,
        isDefault: true,
      },
    ],
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const targetId = payload.id?.trim();
  let createdId: string;
  if (targetId) {
    await setDoc(doc(firestoreDb, 'products', targetId), docPayload);
    createdId = targetId;
  } else {
    const ref = await addDoc(collection(firestoreDb, 'products'), docPayload);
    createdId = ref.id;
  }

  return fetchProductById(createdId);
}

export async function updateProduct(
  id: string,
  payload: Partial<QuickProductPayload>,
): Promise<Product> {
  const ref = doc(firestoreDb, 'products', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('المنتج غير موجود');
  const current = snap.data() as FirestoreProductDoc;

  await updateDoc(ref, {
    ...(payload.categoryId !== undefined ? { categoryId: payload.categoryId } : {}),
    ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
    ...(payload.price !== undefined ? { price: payload.price } : {}),
    ...(payload.stock !== undefined ? { stockQuantity: payload.stock } : {}),
    ...(payload.imageUrl !== undefined ? { imageUrl: payload.imageUrl } : {}),
    updatedAt: new Date().toISOString(),
  });

  if (payload.imageUrl !== undefined && current.imageUrl && payload.imageUrl !== current.imageUrl) {
    void deleteStorageImage(current.imageUrl).catch(() => undefined);
  }

  return fetchProductById(id);
}

export async function deleteProduct(id: string): Promise<void> {
  const ref = doc(firestoreDb, 'products', id);
  const snap = await getDoc(ref);
  const previousImageUrl = snap.exists() ? (snap.data() as FirestoreProductDoc).imageUrl : null;

  await updateDoc(ref, {
    deletedAt: new Date().toISOString(),
    isActive: false,
    updatedAt: new Date().toISOString(),
  });

  if (previousImageUrl) {
    void deleteStorageImage(previousImageUrl).catch(() => undefined);
  }
}
