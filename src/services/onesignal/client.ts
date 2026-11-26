import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Alert, Platform, TurboModuleRegistry } from 'react-native';

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

function isRegisteredSubscriptionId(subscriptionId: string | null | undefined): boolean {
  return Boolean(subscriptionId) && !subscriptionId!.startsWith('local-');
}

/**
 * Centralized OneSignal SDK wrapper isolating all direct SDK interactions.
 */
class OneSignalService {
  private initializedAppId: string | null = null;
  private verificationDialogShown = false;
  private subscriptionObserverAttached = false;

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

    if (this.initializedAppId !== cleanAppId) {
      OneSignal.Debug.setLogLevel(__DEV__ ? LogLevel.Verbose : LogLevel.None);
      OneSignal.initialize(cleanAppId);
      this.initializedAppId = cleanAppId;
      this.setupPushSubscriptionObserver(OneSignal);
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
  }

  private setupPushSubscriptionObserver(OneSignal: typeof OneSignalType): void {
    if (this.subscriptionObserverAttached) return;
    this.subscriptionObserverAttached = true;

    const maybeShowVerificationDialog = (subscriptionId: string | null | undefined): void => {
      if (isRegisteredSubscriptionId(subscriptionId) && !this.verificationDialogShown) {
        this.verificationDialogShown = true;
        Alert.alert(
          'Your OneSignal SDK integration is complete!',
          'You can now send Push Notifications & In-App Messages through OneSignal. Tap below to enable push notifications.',
          [
            {
              text: 'Got it',
              onPress: () => {
                OneSignal.Notifications.requestPermission(true);
              },
            },
          ],
          { cancelable: false },
        );
      }
    };

    OneSignal.User.pushSubscription.addEventListener(
      'change',
      (subscription: PushSubscriptionChangedState) => {
        maybeShowVerificationDialog(subscription.current.id);
      },
    );

    void OneSignal.User.pushSubscription.getIdAsync().then(maybeShowVerificationDialog);
  }

  public login(externalUserId: string): void {
    if (!externalUserId) return;
    const pkg = loadOneSignalPackage();
    pkg?.OneSignal.login(externalUserId);
  }

  public logout(): void {
    const pkg = loadOneSignalPackage();
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
    return pkg.OneSignal.Notifications.requestPermission(true);
  }
}

export const oneSignalService = new OneSignalService();
