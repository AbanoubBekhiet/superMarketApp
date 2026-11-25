import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { registerDevicePushToken } from '@/lib/notifications';
import { normalizePhoneNumber, phoneToAuthEmail, sanitizePublicEmail } from '@/lib/phoneAuth';
import { callFunction, firebaseAuth } from '@/services/firebase/app';
import type { AuthSession, UserRole } from '@/types/domain';

export interface LoginPayload {
  phone: string;
  password: string;
  role?: UserRole;
}

export interface RegisterPayload {
  name: string;
  phone: string;
  password: string;
  area: string;
}

interface SyncProfileResponse {
  user: {
    id: string;
    firebaseUid: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    avatarUrl: string | null;
    role: UserRole;
    isActive: boolean;
    area: string;
  };
  claimsRefreshed: boolean;
}

function mapFirebaseAuthError(error: unknown): Error {
  const code = (error as { code?: string })?.code ?? '';
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return new Error('رقم الهاتف أو كلمة المرور غير صحيحة');
  }
  if (code === 'auth/email-already-in-use') {
    return new Error('رقم الهاتف مسجل بالفعل');
  }
  if (code === 'auth/user-disabled') {
    return new Error('تم إيقاف هذا الحساب. يرجى التواصل مع الإدارة.');
  }
  if (code === 'auth/too-many-requests') {
    return new Error('محاولات تسجيل دخول كثيرة، يرجى المحاولة لاحقاً');
  }
  if (code === 'auth/network-request-failed') {
    return new Error('تعذر الاتصال بخادم المصادقة. تأكد من تشغيل محاكيات Firebase واتصال الشبكة.');
  }
  if (error instanceof Error) return error;
  return new Error('حدث خطأ أثناء المصادقة');
}

export async function loginMobile(payload: LoginPayload): Promise<AuthSession> {
  try {
    const normalizedPhone = normalizePhoneNumber(payload.phone);
    const authEmail = phoneToAuthEmail(normalizedPhone);
    const credential = await signInWithEmailAndPassword(firebaseAuth, authEmail, payload.password);
    const synced = await callFunction<Record<string, never>, SyncProfileResponse>(
      'syncCurrentUserProfile',
      {},
    );
    if (!synced.user.isActive) {
      await signOut(firebaseAuth);
      throw new Error('تم إيقاف هذا الحساب. يرجى التواصل مع الإدارة.');
    }

    const tokenResult = await credential.user.getIdTokenResult(synced.claimsRefreshed);
    const isStaff = synced.user.role === 'admin' || synced.user.role === 'sub_admin';
    void registerDevicePushToken(isStaff);

    return {
      token: tokenResult.token,
      user: {
        id: synced.user.id,
        firebaseUid: synced.user.firebaseUid,
        name: synced.user.fullName,
        phone: synced.user.phone ?? normalizedPhone,
        email: sanitizePublicEmail(synced.user.email),
        role: synced.user.role,
        status: synced.user.isActive ? 'active' : 'suspended',
        isActive: synced.user.isActive,
        avatarKey: synced.user.avatarUrl ?? 'avatar-ahmed',
        area: synced.user.area,
        ordersCount: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    throw mapFirebaseAuthError(err);
  }
}

export async function registerMobile(payload: RegisterPayload): Promise<AuthSession> {
  try {
    const normalizedPhone = normalizePhoneNumber(payload.phone);
    const authEmail = phoneToAuthEmail(normalizedPhone);
    const credential = await createUserWithEmailAndPassword(
      firebaseAuth,
      authEmail,
      payload.password,
    );
    const res = await callFunction<
      { fullName: string; phone: string; area: string },
      { user: SyncProfileResponse['user'] }
    >('registerCustomerProfile', {
      fullName: payload.name.trim(),
      phone: normalizedPhone,
      area: payload.area.trim(),
    });

    const token = await credential.user.getIdToken(true);
    void registerDevicePushToken(false);

    return {
      token,
      user: {
        id: res.user.id,
        firebaseUid: res.user.firebaseUid,
        name: res.user.fullName,
        phone: res.user.phone ?? normalizedPhone,
        email: sanitizePublicEmail(res.user.email),
        role: 'customer',
        status: 'active',
        isActive: true,
        avatarKey: res.user.avatarUrl ?? 'avatar-ahmed',
        area: res.user.area,
        ordersCount: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    throw mapFirebaseAuthError(err);
  }
}
