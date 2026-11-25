import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { getMyProfile, refreshMyDeviceToken, registerMyDeviceToken } from '@/dataconnect-generated';
import { dataConnect } from '@/services/firebase/app';
import { useAuthStore } from '@/store/authStore';

export function configureNotifications(): void {
  if (Platform.OS === 'web') return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Obtains the native FCM/APNs device push token (when running in a dev/standalone build)
 * or falls back cleanly in Expo Go, and stores it in PostgreSQL `user_devices`.
 */
export async function registerDevicePushToken(isStaff = false): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const granted = await requestNotificationPermission();
    if (!granted) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'تنبيهات طازج',
        importance: AndroidImportance.HIGH,
      });
    }

    let token: string | null = null;
    if (Device.isDevice) {
      try {
        const devicePush = await Notifications.getDevicePushTokenAsync();
        token = typeof devicePush.data === 'string' ? devicePush.data : null;
      } catch {
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (projectId) {
          const expoPush = await Notifications.getExpoPushTokenAsync({ projectId });
          token = expoPush.data;
        }
      }
    }

    if (!token) return null;

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    const deviceName = Device.modelName ?? (isStaff ? 'جهاز الإدارة' : 'جهاز العميل');

    try {
      const userId =
        useAuthStore.getState().user?.id ??
        (await getMyProfile(dataConnect)).data.users[0]?.id;
      if (!userId) return token;
      await registerMyDeviceToken(dataConnect, {
        userId,
        fcmToken: token,
        platform,
        deviceName,
      });
    } catch {
      await refreshMyDeviceToken(dataConnect, {
        fcmToken: token,
        deviceName,
      });
    }

    return token;
  } catch {
    return null;
  }
}

export function attachNotificationTapListener(): () => void {
  if (Platform.OS === 'web') return () => undefined;

  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as
      | { orderId?: string; screen?: string }
      | undefined;

    if (data?.orderId) {
      router.push('/(user)/(tabs)/orders');
    }
  });

  return () => sub.remove();
}
