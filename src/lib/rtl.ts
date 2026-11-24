import { DevSettings, I18nManager, Platform } from 'react-native';

let reloadAttempted = false;

export function ensureForcedRtl(): void {
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    }
    return;
  }

  I18nManager.allowRTL(true);
  if (!I18nManager.isRTL) {
    I18nManager.forceRTL(true);
    if (!reloadAttempted && typeof DevSettings?.reload === 'function') {
      reloadAttempted = true;
      DevSettings.reload();
    }
  }
}
