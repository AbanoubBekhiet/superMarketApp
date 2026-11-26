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
  onesignalAppId: string;
  r2UploadUrl: string;
}

export const env: AppEnv = {
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'supermarketapp-cd828',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  },
  onesignalAppId: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ?? '',
  r2UploadUrl: process.env.EXPO_PUBLIC_R2_UPLOAD_URL ?? '',
};
