import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { addDoc, collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { dispatchCustomerStaffAlertPush, registerDevicePushToken } from '@/lib/notifications';
import { normalizePhoneNumber, phoneToAuthEmail, sanitizePublicEmail } from '@/lib/phoneAuth';
import { firebaseAuth, firestoreDb } from '@/services/firebase/app';
import type { FirestoreUserDoc } from '@/services/firebase/mappers';
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
  street?: string;
  latitude: number;
  longitude: number;
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
    return new Error('تعذر الاتصال بخادم المصادقة. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.');
  }
  if (error instanceof Error) return error;
  return new Error('حدث خطأ أثناء المصادقة');
}

export async function loginMobile(payload: LoginPayload): Promise<AuthSession> {
  try {
    const normalizedPhone = normalizePhoneNumber(payload.phone);
    const authEmail = phoneToAuthEmail(normalizedPhone);
    const credential = await signInWithEmailAndPassword(firebaseAuth, authEmail, payload.password);
    const uid = credential.user.uid;

    const userRef = doc(firestoreDb, 'users', uid);
    const snap = await getDoc(userRef);

    let profile: FirestoreUserDoc;
    if (!snap.exists()) {
      const now = new Date().toISOString();
      profile = {
        firebaseUid: uid,
        fullName: credential.user.displayName ?? 'عميل طازج',
        phone: normalizedPhone,
        email: null,
        avatarUrl: 'avatar-ahmed',
        role: 'customer',
        isActive: true,
        area: 'الإسكندرية',
        deletedAt: null,
        createdAt: now,
      };
      await setDoc(userRef, { id: uid, ...profile });
    } else {
      profile = snap.data() as FirestoreUserDoc;
    }

    if (!profile.isActive || profile.deletedAt) {
      await signOut(firebaseAuth);
      throw new Error('تم إيقاف هذا الحساب. يرجى التواصل مع الإدارة.');
    }

    await updateDoc(userRef, { lastLoginAt: new Date().toISOString() }).catch(() => undefined);

    const token = await credential.user.getIdToken();
    const isStaff = profile.role === 'admin' || profile.role === 'sub_admin';
    void registerDevicePushToken(isStaff, uid);

    return {
      token,
      user: {
        id: uid,
        firebaseUid: uid,
        name: profile.fullName,
        phone: profile.phone ?? normalizedPhone,
        email: sanitizePublicEmail(profile.email ?? credential.user.email),
        role: profile.role,
        status: 'active',
        isActive: true,
        avatarKey: profile.avatarUrl ?? 'avatar-ahmed',
        area: profile.area ?? 'الإسكندرية',
        latitude: profile.latitude ?? null,
        longitude: profile.longitude ?? null,
        ordersCount: 0,
        totalSpent: 0,
        createdAt: profile.createdAt ?? new Date().toISOString(),
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
    const uid = credential.user.uid;
    const now = new Date().toISOString();
    const fullName = payload.name.trim();
    const area = payload.area.trim();
    const street = payload.street?.trim() || area;
    const { latitude, longitude } = payload;

    await setDoc(doc(firestoreDb, 'users', uid), {
      id: uid,
      firebaseUid: uid,
      fullName,
      phone: normalizedPhone,
      email: null,
      avatarUrl: 'avatar-ahmed',
      role: 'customer',
      isActive: true,
      area,
      latitude,
      longitude,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    await addDoc(collection(firestoreDb, 'users', uid, 'addresses'), {
      label: 'موقعي الحالي',
      governorate: area,
      city: area,
      area,
      street,
      building: null,
      floor: null,
      apartment: null,
      landmark: null,
      latitude,
      longitude,
      isDefault: true,
      deliveryNotes: null,
    });

    await addDoc(collection(firestoreDb, 'notifications'), {
      userId: null,
      targetRole: 'staff',
      title: 'تسجيل عميل جديد',
      body: `انضم العميل "${fullName}" (برقم ${normalizedPhone}) للتطبيق بنجاح.`,
      type: 'admin_alert',
      dataPayload: JSON.stringify({ customerId: uid, kind: 'new_customer' }),
      isRead: false,
      createdAt: now,
    }).catch(() => undefined);

    const token = await credential.user.getIdToken();
    void registerDevicePushToken(false, uid);
    void dispatchCustomerStaffAlertPush({ kind: 'new_customer' });

    return {
      token,
      user: {
        id: uid,
        firebaseUid: uid,
        name: fullName,
        phone: normalizedPhone,
        email: '',
        role: 'customer',
        status: 'active',
        isActive: true,
        avatarKey: 'avatar-ahmed',
        area,
        latitude,
        longitude,
        ordersCount: 0,
        totalSpent: 0,
        createdAt: now,
      },
    };
  } catch (err) {
    throw mapFirebaseAuthError(err);
  }
}
