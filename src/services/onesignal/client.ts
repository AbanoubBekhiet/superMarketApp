import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform, TurboModuleRegistry } from 'react-native';

import type {
  LogLevel as LogLevelEnum,
  NotificationClickEvent,
  NotificationWillDisplayEvent,
  OneSignal as OneSignalType,
  PushSubscriptionChangedState,
} from 'react-native-onesignal';

interface OneSignalPackage {
  OneSignal: typeof OneSignalType;
  LogLevel: typeof LogLevelEnum;
}

function loadOneSignalPackage(): OneSignalPackage | null {
  if (Platform.OS === 'web') {
    return null;
  }
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return null;
  }
  if (!TurboModuleRegistry.get('OneSignal')) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-onesignal') as OneSignalPackage;
  } catch {
    return null;
  }
}

/**
 * Centralized OneSignal SDK wrapper isolating all direct SDK interactions.
 */
class OneSignalService {
  private initializedAppId: string | null = null;
  private permissionRequested = false;
  private subscriptionObserverAttached = false;
  private currentRole: 'customer' | 'staff' | null = null;

  public isAvailable(): boolean {
    return loadOneSignalPackage() !== null;
  }

  public initialize(
    appId: string,
    onNotificationClick?: (additionalData?: Record<string, unknown>) => void,
  ): () => void {
    const cleanAppId = appId.trim();
    if (!cleanAppId) return () => undefined;

    const pkg = loadOneSignalPackage();
    if (!pkg) return () => undefined;

    const { OneSignal, LogLevel } = pkg;

    try {
      if (this.initializedAppId !== cleanAppId) {
        OneSignal.Debug.setLogLevel(__DEV__ ? LogLevel.Verbose : LogLevel.None);
        OneSignal.initialize(cleanAppId);
        this.initializedAppId = cleanAppId;
        this.setupPushSubscriptionObserver(OneSignal);
        void this.ensurePermissionAndOptIn(OneSignal);
      }

      const clickListener = (event: NotificationClickEvent): void => {
        const data = event.notification?.additionalData as Record<string, unknown> | undefined;
        onNotificationClick?.(data);
      };

      const foregroundListener = (event: NotificationWillDisplayEvent): void => {
        event.getNotification().display();
      };

      OneSignal.Notifications.addEventListener('click', clickListener);
      OneSignal.Notifications.addEventListener('foregroundWillDisplay', foregroundListener);

      return () => {
        OneSignal.Notifications.removeEventListener('click', clickListener);
        OneSignal.Notifications.removeEventListener('foregroundWillDisplay', foregroundListener);
      };
    } catch {
      return () => undefined;
    }
  }

  private async ensurePermissionAndOptIn(OneSignal: typeof OneSignalType): Promise<void> {
    if (this.permissionRequested) {
      OneSignal.User.pushSubscription.optIn();
      return;
    }
    this.permissionRequested = true;
    try {
      const granted = await OneSignal.Notifications.requestPermission(true);
      if (granted) {
        OneSignal.User.pushSubscription.optIn();
      }
    } catch {
      // Ignore permission prompt cancellation or unsupported environments
    }
  }

  private setupPushSubscriptionObserver(OneSignal: typeof OneSignalType): void {
    if (this.subscriptionObserverAttached) return;
    this.subscriptionObserverAttached = true;

    OneSignal.User.pushSubscription.addEventListener(
      'change',
      (subscription: PushSubscriptionChangedState) => {
        if (this.currentRole) {
          OneSignal.User.addTag('role', this.currentRole);
        }
        if (subscription.current.token && !subscription.current.optedIn) {
          OneSignal.User.pushSubscription.optIn();
        }
      },
    );
  }

  public login(externalUserId: string, role?: 'customer' | 'staff'): void {
    if (!externalUserId) return;
    if (role) {
      this.currentRole = role;
    }
    const pkg = loadOneSignalPackage();
    if (!pkg) return;

    const { OneSignal } = pkg;
    OneSignal.login(externalUserId);
    if (role) {
      OneSignal.User.addTag('role', role);
    }
    OneSignal.User.pushSubscription.optIn();
    void this.ensurePermissionAndOptIn(OneSignal);
  }

  public logout(): void {
    this.currentRole = null;
    const pkg = loadOneSignalPackage();
    pkg?.OneSignal.User.removeTag('role');
    pkg?.OneSignal.logout();
  }

  public setEmail(email: string): void {
    if (!email) return;
    const pkg = loadOneSignalPackage();
    pkg?.OneSignal.User.addEmail(email);
  }

  public setPhone(phone: string): void {
    if (!phone) return;
    const pkg = loadOneSignalPackage();
    pkg?.OneSignal.User.addSms(phone);
  }

  public addTag(key: string, value: string): void {
    const pkg = loadOneSignalPackage();
    pkg?.OneSignal.User.addTag(key, value);
  }

  public async requestPermission(): Promise<boolean> {
    const pkg = loadOneSignalPackage();
    if (!pkg) return false;
    const granted = await pkg.OneSignal.Notifications.requestPermission(true);
    if (granted) {
      pkg.OneSignal.User.pushSubscription.optIn();
    }
    return granted;
  }
}

export const oneSignalService = new OneSignalService();
