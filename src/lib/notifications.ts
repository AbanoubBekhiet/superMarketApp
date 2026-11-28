import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { LogBox, Platform } from 'react-native';
import { env } from '@/lib/env';
import { firebaseAuth } from '@/services/firebase/app';
import { oneSignalService } from '@/services/onesignal/client';
import { useAuthStore } from '@/store/authStore';

let expoNotificationsConfigured = false;

export function configureNotifications(): void {
  if (Platform.OS === 'web') return;
  LogBox.ignoreLogs(['expo-notifications']);

  if (expoNotificationsConfigured) return;
  expoNotificationsConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync('default', {
      name: 'إشعارات طازج',
      importance: 7 as Notifications.AndroidImportance, // AndroidImportance.MAX
      vibrationPattern: [0, 250, 250, 250],
    }).catch(() => undefined);
  }
}

function handleNotificationRoute(data?: Record<string, unknown>): void {
  const role = useAuthStore.getState().user?.role;
  const isStaff = role === 'admin' || role === 'sub_admin';
  const orderId = data?.orderId;

  if (isStaff && data?.kind === 'new_customer') {
    router.push('/(admin)/customers');
    return;
  }

  if (isStaff && (data?.kind === 'new_order' || typeof orderId === 'string')) {
    router.push('/(admin)/orders');
    return;
  }

  if (typeof orderId === 'string' && orderId.length > 0) {
    router.push('/(user)/(tabs)/orders');
  }
}

export function initializeOneSignalRoot(): () => void {
  if (Platform.OS === 'web') return () => undefined;

  if (!oneSignalService.isAvailable()) {
    void Notifications.requestPermissionsAsync().catch(() => undefined);
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | Record<string, unknown>
        | undefined;
      handleNotificationRoute(data);
    });
    return () => sub.remove();
  }

  const appId = env.onesignalAppId.trim();
  if (!appId) return () => undefined;

  return oneSignalService.initialize(appId, handleNotificationRoute);
}

export async function initializeAndLoginOneSignal(
  externalUserId?: string,
  isStaff = false,
): Promise<void> {
  if (Platform.OS === 'web') return;

  if (!oneSignalService.isAvailable()) {
    await Notifications.requestPermissionsAsync().catch(() => undefined);
    return;
  }

  const appId = env.onesignalAppId.trim();
  if (appId) {
    oneSignalService.initialize(appId, handleNotificationRoute);
  }
  if (externalUserId) {
    oneSignalService.login(externalUserId, isStaff ? 'staff' : 'customer');
  }
}

export function logoutOneSignal(): void {
  oneSignalService.logout();
}

export async function registerDevicePushToken(
  isStaff = false,
  externalUserId?: string,
): Promise<string | null> {
  await initializeAndLoginOneSignal(externalUserId, isStaff);
  return null;
}

export function attachNotificationTapListener(): () => void {
  return initializeOneSignalRoot();
}

export function isRunningInExpoGoClient(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export async function presentLocalNotification(
  title: string,
  body: string,
  data?: string | Record<string, unknown>,
): Promise<void> {
  if (Platform.OS === 'web') return;
  let parsedData: Record<string, unknown> = {};
  if (typeof data === 'string' && data.trim()) {
    try {
      const parsed = JSON.parse(data) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        parsedData = parsed as Record<string, unknown>;
      }
    } catch {
      parsedData = {};
    }
  } else if (data && typeof data === 'object') {
    parsedData = data;
  }

  try {
    const perms = await Notifications.getPermissionsAsync();
    if (perms.status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status !== 'granted') return;
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: parsedData,
      },
      trigger: null,
    });
  } catch {
    // Non-blocking fallback when local notifications are unavailable
  }
}

export async function dispatchCustomerStaffAlertPush(params: {
  kind: 'new_customer' | 'new_order';
  orderId?: string;
}): Promise<void> {
  const baseUrl = env.r2UploadUrl.trim().replace(/\/+$/, '');
  const idToken = await firebaseAuth.currentUser?.getIdToken().catch(() => null);
  if (!baseUrl || !idToken) return;

  await fetch(`${baseUrl}/push/staff-alert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      kind: params.kind,
      ...(params.orderId ? { orderId: params.orderId } : {}),
      appId: env.onesignalAppId.trim(),
    }),
  }).catch(() => undefined);
}

export async function dispatchStaffOneSignalPush(params: {
  title: string;
  body: string;
  externalIds: string[];
  data?: Record<string, string>;
}): Promise<void> {
  const baseUrl = env.r2UploadUrl.trim().replace(/\/+$/, '');
  const idToken = await firebaseAuth.currentUser?.getIdToken().catch(() => null);
  if (!baseUrl || !idToken || params.externalIds.length === 0) return;

  await fetch(`${baseUrl}/push/onesignal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      title: params.title,
      body: params.body,
      externalIds: params.externalIds,
      data: params.data ?? {},
      appId: env.onesignalAppId.trim(),
    }),
  }).catch(() => undefined);
}
