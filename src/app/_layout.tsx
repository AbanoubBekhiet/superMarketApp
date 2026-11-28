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
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { collection, onSnapshot } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BrandSplash } from '@/components/ui/BrandSplash';
import { AppErrorBoundary } from '@/components/ui/StateViews';
import { ToastBanner } from '@/components/ui/ToastBanner';
import { useNotifications } from '@/features/profile/hooks/useProfile';
import {
  attachNotificationTapListener,
  configureNotifications,
  presentLocalNotification,
  registerDevicePushToken,
} from '@/lib/notifications';
import { queryClient } from '@/lib/queryClient';
import { ensureForcedRtl } from '@/lib/rtl';
import { firestoreDb } from '@/services/firebase/app';
import { oneSignalService } from '@/services/onesignal/client';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';

ensureForcedRtl();
configureNotifications();
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function LiveNotificationWatcher() {
  const user = useAuthStore((s) => s.user);
  const showToast = useUiStore((s) => s.showToast);
  const qc = useQueryClient();
  const { data: notifications = [], isFetched } = useNotifications();
  const seenIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    seenIdsRef.current = null;
  }, [user?.id]);

  useEffect(() => {
    let bannersInit = true;
    let settingsInit = true;
    let productsInit = true;
    let categoriesInit = true;

    const unsubBanners = onSnapshot(
      collection(firestoreDb, 'banners'),
      () => {
        if (bannersInit) {
          bannersInit = false;
          return;
        }
        void qc.invalidateQueries({ queryKey: ['banners'] });
      },
      () => undefined,
    );

    const unsubSettings = onSnapshot(
      collection(firestoreDb, 'appSettings'),
      () => {
        if (settingsInit) {
          settingsInit = false;
          return;
        }
        void qc.invalidateQueries({ queryKey: ['app-settings'] });
      },
      () => undefined,
    );

    const unsubProducts = onSnapshot(
      collection(firestoreDb, 'products'),
      () => {
        if (productsInit) {
          productsInit = false;
          return;
        }
        void qc.invalidateQueries({ queryKey: ['products'] });
      },
      () => undefined,
    );

    const unsubCategories = onSnapshot(
      collection(firestoreDb, 'categories'),
      () => {
        if (categoriesInit) {
          categoriesInit = false;
          return;
        }
        void qc.invalidateQueries({ queryKey: ['categories'] });
      },
      () => undefined,
    );

    return () => {
      unsubBanners();
      unsubSettings();
      unsubProducts();
      unsubCategories();
    };
  }, [qc]);

  useEffect(() => {
    if (!user?.id || !isFetched) return;
    if (seenIdsRef.current === null) {
      seenIdsRef.current = new Set(notifications.map((n) => n.id));
      return;
    }

    const unseenNew = notifications.filter(
      (n) => !n.isRead && !seenIdsRef.current?.has(n.id),
    );
    notifications.forEach((n) => seenIdsRef.current?.add(n.id));

    if (unseenNew.length > 0) {
      const latest = unseenNew[0];
      showToast(latest.body, 'success', { title: latest.title, kind: 'notification' });
      if (!oneSignalService.isAvailable()) {
        void presentLocalNotification(latest.title, latest.body, latest.dataPayload ?? undefined);
      }
      void qc.invalidateQueries({ queryKey: ['orders'] });
      void qc.invalidateQueries({ queryKey: ['products'] });
      void qc.invalidateQueries({ queryKey: ['banners'] });
      void qc.invalidateQueries({ queryKey: ['customers'] });
      void qc.invalidateQueries({ queryKey: ['active-carts'] });
      void qc.invalidateQueries({ queryKey: ['admin'] });
    }
  }, [isFetched, notifications, qc, showToast, user?.id]);

  return null;
}

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
  const [splashDone, setSplashDone] = useState(false);

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true);
  }, []);

  useEffect(() => {
    hydrate();
    return attachNotificationTapListener();
  }, [hydrate]);

  useEffect(() => {
    if (currentUser?.id) {
      const isStaff = currentUser.role === 'admin' || currentUser.role === 'sub_admin';
      void registerDevicePushToken(isStaff, currentUser.id);
    }
  }, [currentUser?.id, currentUser?.role]);

  const fontsReady = cairoLoaded && tajawalLoaded;

  useEffect(() => {
    if (fontsReady && isHydrated) {
      void SplashScreen.hideAsync().catch(() => undefined);
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
            <LiveNotificationWatcher />
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(user)" />
              <Stack.Screen name="(admin)" />
              <Stack.Screen name="admin-settings" />
              <Stack.Screen name="admin-carts" />
            </Stack>
            <ToastBanner />
            {!splashDone ? <BrandSplash onFinish={handleSplashFinish} /> : null}
          </AppErrorBoundary>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
