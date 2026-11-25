import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { sanitizePublicEmail } from '@/lib/phoneAuth';
import { callFunction, firebaseAuth } from '@/services/firebase/app';
import type { AuthSession, User, UserRole } from '@/types/domain';

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
          const synced = await callFunction<Record<string, never>, SyncProfileResponse>(
            'syncCurrentUserProfile',
            {},
          );
          const token = await fbUser.getIdToken(true);
          const hydratedUser: User = {
            id: synced.user.id,
            firebaseUid: synced.user.firebaseUid,
            name: synced.user.fullName,
            phone: synced.user.phone ?? '',
            email: sanitizePublicEmail(synced.user.email),
            role: synced.user.role,
            status: synced.user.isActive ? 'active' : 'suspended',
            isActive: synced.user.isActive,
            avatarKey: synced.user.avatarUrl ?? 'avatar-ahmed',
            area: synced.user.area,
            ordersCount: 0,
            totalSpent: 0,
            createdAt: new Date().toISOString(),
          };
          await saveToken(token);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(hydratedUser));
          set({ user: hydratedUser, token, isHydrated: true });
        } catch {
          await firebaseSignOut(firebaseAuth).catch(() => undefined);
          await deleteToken();
          await AsyncStorage.removeItem(USER_KEY);
          set({ token: null, user: null, isHydrated: true });
        }
        resolve();
      });
    });
  },

  setSession: async (session) => {
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
    await firebaseSignOut(firebaseAuth).catch(() => undefined);
    await deleteToken();
    await AsyncStorage.removeItem(USER_KEY);
    set({ user: null, token: null });
  },
}));
