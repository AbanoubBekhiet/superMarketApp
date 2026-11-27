import { AlertCircle, BellRing, CheckCircle2, X } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';

export function ToastBanner() {
  const toast = useUiStore((s) => s.toast);
  const clearToast = useUiStore((s) => s.clearToast);
  const insets = useSafeAreaInsets();

  const isNotification = toast?.kind === 'notification';

  useEffect(() => {
    if (!toast) return;
    const duration = isNotification ? 5200 : 2600;
    const timer = setTimeout(clearToast, duration);
    return () => clearTimeout(timer);
  }, [toast, isNotification, clearToast]);

  if (!toast) return null;

  const isError = toast.tone === 'error';

  if (isNotification) {
    return (
      <View
        pointerEvents="box-none"
        style={{ top: Math.max(insets.top + 8, 16) }}
        className="absolute inset-x-4 z-50 items-center"
      >
        <View
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.14,
            shadowRadius: 12,
            elevation: 8,
          }}
          className="w-full max-w-[390px] bg-surface-card rounded-xl border-2 border-primary p-md flex-row items-start gap-md"
        >
          <View className="w-10 h-10 rounded-full bg-primary items-center justify-center mt-0.5">
            <BellRing size={19} color={colors.onPrimary} />
          </View>

          <View className="flex-1 gap-xs">
            <View className="flex-row items-center justify-between gap-sm">
              <Text
                className="flex-1 font-headline text-title-sm text-on-surface text-right"
                numberOfLines={1}
              >
                {toast.title || 'إشعار جديد'}
              </Text>
              <View className="px-sm py-0.5 rounded-full bg-mint-surface">
                <Text className="font-label-bold text-label-sm text-on-mint-surface">
                  إشعار جديد
                </Text>
              </View>
            </View>
            <Text
              className="font-body text-body-md text-on-surface-muted text-right leading-5"
              numberOfLines={3}
            >
              {toast.message}
            </Text>
          </View>

          <Pressable
            onPress={clearToast}
            hitSlop={10}
            accessibilityLabel="إغلاق الإشعار"
            className="w-7 h-7 rounded-full bg-surface-subtle items-center justify-center"
          >
            <X size={15} color={colors.onSurfaceMuted} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
      pointerEvents="none"
      style={{ top: Math.max(insets.top + 8, 16) }}
      className="absolute inset-x-4 z-50 items-center"
    >
      <View
        className={`w-full max-w-[370px] flex-row items-center gap-sm px-base py-md rounded-md border ${
          isError
            ? 'bg-error-container border-error'
            : 'bg-mint-surface border-primary'
        }`}
      >
        {isError ? (
          <AlertCircle size={18} color={colors.error} />
        ) : (
          <CheckCircle2 size={18} color={colors.primaryDeep} />
        )}
        <Text
          className={`flex-1 font-label text-label-md text-right ${
            isError ? 'text-on-error-container' : 'text-on-mint-surface'
          }`}
        >
          {toast.message}
        </Text>
      </View>
    </View>
  );
}
