import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

interface FirebaseEnvConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

interface AppEnv {
  firebase: FirebaseEnvConfig;
  useEmulators: boolean;
  emulatorHost: string;
}

function resolveDefaultEmulatorHost(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri && Platform.OS !== 'web') {
    const metroHost = hostUri.split(':')[0];
    if (metroHost && metroHost !== 'localhost' && metroHost !== '127.0.0.1') {
      return metroHost;
    }
  }
  if (Platform.OS === 'android' && !Device.isDevice) {
    return '10.0.2.2';
  }
  return '127.0.0.1';
}

const rawHost = process.env.EXPO_PUBLIC_EMULATOR_HOST?.trim();

export const env: AppEnv = {
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'supermarketapp-cd828',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  },
  useEmulators: process.env.EXPO_PUBLIC_USE_EMULATORS === 'true',
  emulatorHost: rawHost && rawHost.length > 0 ? rawHost : resolveDefaultEmulatorHost(),
};
