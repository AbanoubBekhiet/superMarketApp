import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';
import { doc, getDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { initializeAndLoginOneSignal, logoutOneSignal } from '@/lib/notifications';
import { sanitizePublicEmail } from '@/lib/phoneAuth';
import { queryClient } from '@/lib/queryClient';
import { firebaseAuth, firestoreDb } from '@/services/firebase/app';
import type { FirestoreUserDoc } from '@/services/firebase/mappers';
import { useCartStore } from '@/store/cartStore';
import type { AuthSession, User } from '@/types/domain';

const TOKEN_KEY = 'tazaj_auth_token';
const USER_KEY = 'tazaj_auth_user';

async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function deleteToken(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

interface AuthState {
  user: User | null;
  token: string | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (session: AuthSession) => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isHydrated: false,

  hydrate: async () => {
    await new Promise<void>((resolve) => {
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
        unsubscribe();
        if (!fbUser) {
          await deleteToken();
          await AsyncStorage.removeItem(USER_KEY);
          set({ token: null, user: null, isHydrated: true });
          resolve();
          return;
        }

        try {
          const snap = await getDoc(doc(firestoreDb, 'users', fbUser.uid));
          const profile = snap.exists() ? (snap.data() as FirestoreUserDoc) : null;
          if (!profile || !profile.isActive || profile.deletedAt) {
            await firebaseSignOut(firebaseAuth).catch(() => undefined);
            await deleteToken();
            await AsyncStorage.removeItem(USER_KEY);
            set({ token: null, user: null, isHydrated: true });
            resolve();
            return;
          }

          const token = await fbUser.getIdToken();
          const hydratedUser: User = {
            id: fbUser.uid,
            firebaseUid: fbUser.uid,
            name: profile.fullName,
            phone: profile.phone ?? '',
            email: sanitizePublicEmail(profile.email ?? fbUser.email),
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
          };
          await saveToken(token);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(hydratedUser));
          void useCartStore.getState().loadUserCart({
            userId: fbUser.uid,
            customerName: hydratedUser.name,
            customerPhone: hydratedUser.phone,
            customerArea: hydratedUser.area,
          });
          set({ user: hydratedUser, token, isHydrated: true });
          void initializeAndLoginOneSignal(fbUser.uid);
        } catch {
          await firebaseSignOut(firebaseAuth).catch(() => undefined);
          await deleteToken();
          await AsyncStorage.removeItem(USER_KEY);
          useCartStore.getState().clearSessionData();
          set({ token: null, user: null, isHydrated: true });
        }
        resolve();
      });
    });
  },

  setSession: async (session) => {
    const prevUid = get().user?.id;
    if (prevUid && prevUid !== session.user.id) {
      queryClient.clear();
    }
    void useCartStore.getState().loadUserCart({
      userId: session.user.id,
      customerName: session.user.name,
      customerPhone: session.user.phone,
      customerArea: session.user.area,
    });
    await saveToken(session.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(session.user));
    set({ user: session.user, token: session.token });
  },

  updateUser: async (patch) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...patch };
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
    set({ user: updated });
  },

  signOut: async () => {
    logoutOneSignal();
    await firebaseSignOut(firebaseAuth).catch(() => undefined);
    await deleteToken();
    await AsyncStorage.removeItem(USER_KEY);
    useCartStore.getState().clearSessionData();
    queryClient.clear();
    set({ user: null, token: null });
  },
}));
