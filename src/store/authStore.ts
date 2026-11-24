import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { setMobileAuthTokenGetter } from '@/services/api/client';
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

async function readToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
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
    try {
      const [token, rawUser] = await Promise.all([readToken(), AsyncStorage.getItem(USER_KEY)]);
      const user = rawUser ? (JSON.parse(rawUser) as User) : null;
      set({ token, user, isHydrated: true });
    } catch {
      set({ token: null, user: null, isHydrated: true });
    }
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
    await deleteToken();
    await AsyncStorage.removeItem(USER_KEY);
    set({ user: null, token: null });
  },
}));

setMobileAuthTokenGetter(() => useAuthStore.getState().token);
