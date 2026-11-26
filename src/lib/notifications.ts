import { router } from 'expo-router';
import { LogBox, Platform } from 'react-native';
import { env } from '@/lib/env';
import { oneSignalService } from '@/services/onesignal/client';

export function configureNotifications(): void {
  if (Platform.OS === 'web') return;
  LogBox.ignoreLogs(['expo-notifications']);
}

function handleNotificationRoute(data?: Record<string, unknown>): void {
  const orderId = data?.orderId;
  if (typeof orderId === 'string' && orderId.length > 0) {
    router.push('/(user)/(tabs)/orders');
  }
}

export function initializeOneSignalRoot(): () => void {
  if (Platform.OS === 'web') return () => undefined;

  const appId = env.onesignalAppId.trim();
  if (!appId) return () => undefined;

  return oneSignalService.initialize(appId, handleNotificationRoute);
}

export async function initializeAndLoginOneSignal(externalUserId?: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const appId = env.onesignalAppId.trim();
  if (appId) {
    oneSignalService.initialize(appId, handleNotificationRoute);
  }
  if (externalUserId) {
    oneSignalService.login(externalUserId);
  }
}

export function logoutOneSignal(): void {
  oneSignalService.logout();
}

export async function registerDevicePushToken(
  _isStaff = false,
  externalUserId?: string,
): Promise<string | null> {
  await initializeAndLoginOneSignal(externalUserId);
  return null;
}

export function attachNotificationTapListener(): () => void {
  return initializeOneSignalRoot();
}
