import { useEffect } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';

export function ToastBanner() {
  const toast = useUiStore((s) => s.toast);
  const clearToast = useUiStore((s) => s.clearToast);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(clearToast, 2600);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;

  const isError = toast.tone === 'error';

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
