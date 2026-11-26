import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuthModule from 'firebase/auth';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import { env } from '@/lib/env';

type AuthWithRnPersistence = typeof FirebaseAuthModule & {
  getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence;
};

function createPlatformAuth(): Auth {
  if (Platform.OS === 'web') {
    return getAuth(firebaseApp);
  }
  const rnPersistenceFactory = (FirebaseAuthModule as AuthWithRnPersistence)
    .getReactNativePersistence;
  if (typeof rnPersistenceFactory === 'function') {
    try {
      return initializeAuth(firebaseApp, {
        persistence: rnPersistenceFactory(AsyncStorage),
      });
    } catch {
      return getAuth(firebaseApp);
    }
  }
  return getAuth(firebaseApp);
}

const isFreshApp = getApps().length === 0;
export const firebaseApp = isFreshApp ? initializeApp(env.firebase) : getApp();
export const firebaseAuth = isFreshApp ? createPlatformAuth() : getAuth(firebaseApp);
export const firestoreDb = getFirestore(firebaseApp, 'default');

function normalizeImageMimeType(mime?: string | null): string {
  const normalized = (mime ?? '').trim().toLowerCase();
  return normalized.startsWith('image/') && normalized !== 'image/*' ? normalized : 'image/jpeg';
}

/**
 * Uploads an image (preferring base64 JSON payload on mobile, falling back to raw bytes) to Cloudflare R2.
 */
export async function uploadStorageFileUri(
  path: string,
  uri: string,
  contentType = 'image/jpeg',
  base64?: string | null,
): Promise<string> {
  const baseUrl = env.r2UploadUrl.trim().replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('يرجى ضبط رابط Cloudflare R2 (EXPO_PUBLIC_R2_UPLOAD_URL) لرفع الصور');
  }

  const idToken = await firebaseAuth.currentUser?.getIdToken();
  if (!idToken) {
    throw new Error('يرجى تسجيل الدخول أولاً لرفع الصور');
  }

  let response: Response;
  const trimmedBase64 = base64?.trim();
  const dataUrlMatch = !trimmedBase64 ? uri.match(/^data:([^;]+);base64,([\s\S]+)$/i) : null;

  if (trimmedBase64 || dataUrlMatch) {
    const cleanBase64 = trimmedBase64
      ? trimmedBase64.replace(/^data:[^;]+;base64,/i, '').replace(/\s+/g, '')
      : (dataUrlMatch?.[2] ?? '').replace(/\s+/g, '');
    const safeMimeType = normalizeImageMimeType(dataUrlMatch?.[1] ?? contentType);

    response = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path,
        contentType: safeMimeType,
        base64: cleanBase64,
      }),
    });
  } else {
    const safeMimeType = normalizeImageMimeType(contentType);
    const fileRes = await fetch(uri);
    if (!fileRes.ok) {
      throw new Error('تعذر قراءة ملف الصورة المختار');
    }
    const bytes = await fileRes.arrayBuffer();

    response = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': safeMimeType,
        'X-Upload-Path': path,
      },
      body: bytes,
    });
  }

  if (!response.ok) {
    const errBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errBody?.error ?? 'تعذر رفع الصورة إلى Cloudflare R2');
  }

  const data = (await response.json()) as { url?: string };
  if (!data.url) {
    throw new Error('لم يتم استلام رابط الصورة من Cloudflare R2');
  }
  return data.url;
}

export function extractR2KeyFromUrl(urlOrKey?: string | null): string | null {
  if (!urlOrKey) return null;
  const trimmed = urlOrKey.trim();
  if (!trimmed || trimmed.startsWith('local://') || trimmed.startsWith('/')) {
    return null;
  }
  const baseUrl = env.r2UploadUrl.trim().replace(/\/+$/, '');
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      const baseOrigin = baseUrl ? new URL(baseUrl).origin : '';
      if (baseOrigin && parsed.origin !== baseOrigin && !parsed.hostname.endsWith('.r2.dev')) {
        return null;
      }
      const key = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
      return key || null;
    } catch {
      return null;
    }
  }
  if (trimmed.includes('/')) {
    return trimmed.replace(/^\/+/, '');
  }
  return null;
}

/**
 * Deletes an uploaded image from Cloudflare R2 via the configured Cloudflare Worker endpoint.
 */
export async function deleteStorageImage(urlOrKey?: string | null): Promise<void> {
  const key = extractR2KeyFromUrl(urlOrKey);
  if (!key) return;

  const baseUrl = env.r2UploadUrl.trim().replace(/\/+$/, '');
  if (!baseUrl) return;

  const idToken = await firebaseAuth.currentUser?.getIdToken();
  if (!idToken) return;

  await fetch(`${baseUrl}/delete`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key }),
  });
}
