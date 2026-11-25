import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuthModule from 'firebase/auth';
import {
  connectAuthEmulator,
  getAuth,
  initializeAuth,
  type Auth,
  type Persistence,
} from 'firebase/auth';
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import {
  connectStorageEmulator,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { Platform } from 'react-native';
import { connectorConfig } from '@/dataconnect-generated';
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
export const dataConnect = getDataConnect(firebaseApp, connectorConfig);
export const firebaseFunctions = getFunctions(firebaseApp, 'europe-west3');
export const firebaseStorage = getStorage(firebaseApp);

if (isFreshApp && env.useEmulators) {
  const host = env.emulatorHost;
  connectAuthEmulator(firebaseAuth, `http://${host}:9099`, { disableWarnings: true });
  connectDataConnectEmulator(dataConnect, host, 9399);
  connectFunctionsEmulator(firebaseFunctions, host, 5001);
  connectStorageEmulator(firebaseStorage, host, 9199);
}

export async function callFunction<TReq, TRes>(name: string, payload: TReq): Promise<TRes> {
  const fn = httpsCallable<TReq, TRes>(firebaseFunctions, name);
  const result = await fn(payload);
  return result.data;
}

export async function uploadStorageBlob(path: string, blob: Blob, contentType = 'image/jpeg'): Promise<string> {
  const storageRef = ref(firebaseStorage, path);
  await uploadBytes(storageRef, blob, { contentType });
  return getDownloadURL(storageRef);
}
