import '../global.css';

import {
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts as useCairoFonts,
} from '@expo-google-fonts/cairo';
import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  useFonts as useTajawalFonts,
} from '@expo-google-fonts/tajawal';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppErrorBoundary } from '@/components/ui/StateViews';
import { ToastBanner } from '@/components/ui/ToastBanner';
import {
  attachNotificationTapListener,
  configureNotifications,
  registerDevicePushToken,
} from '@/lib/notifications';
import { queryClient } from '@/lib/queryClient';
import { ensureForcedRtl } from '@/lib/rtl';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/theme/tokens';

ensureForcedRtl();
configureNotifications();
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [cairoLoaded] = useCairoFonts({
    Cairo_600SemiBold,
    Cairo_700Bold,
  });
  const [tajawalLoaded] = useTajawalFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
  });

  const hydrate = useAuthStore((s) => s.hydrate);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const currentUser = useAuthStore((s) => s.user);

  useEffect(() => {
    hydrate();
    return attachNotificationTapListener();
  }, [hydrate]);

  useEffect(() => {
    if (currentUser?.id) {
      const isStaff = currentUser.role === 'admin' || currentUser.role === 'sub_admin';
      void registerDevicePushToken(isStaff);
    }
  }, [currentUser?.id, currentUser?.role]);

  const fontsReady = cairoLoaded && tajawalLoaded;

  useEffect(() => {
    if (fontsReady && isHydrated) {
      SplashScreen.hideAsync();
    }
  }, [fontsReady, isHydrated]);

  if (!fontsReady || !isHydrated) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surface }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppErrorBoundary>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(user)" />
              <Stack.Screen name="(admin)" />
            </Stack>
            <ToastBanner />
          </AppErrorBoundary>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
