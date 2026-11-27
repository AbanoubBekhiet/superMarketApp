import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '@/theme/tokens';

const SPLASH_LOGO = require('../../../assets/images/splash-icon.png') as number;

interface BrandSplashProps {
  onFinish: () => void;
}

/**
 * Full-screen branded splash overlay matching the native splash configuration
 * (light gray backdrop with centered app logo) that fades out smoothly after startup.
 */
export function BrandSplash({ onFinish }: BrandSplashProps) {
  const [opacity] = useState(() => new Animated.Value(1));
  const [scale] = useState(() => new Animated.Value(0.96));
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 7,
      tension: 65,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      setIsFadingOut(true);
      Animated.timing(opacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onFinish();
        }
      });
    }, 850);

    return () => clearTimeout(timer);
  }, [onFinish, opacity, scale]);

  return (
    <Animated.View
      pointerEvents={isFadingOut ? 'none' : 'auto'}
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        { opacity },
      ]}
    >
      <Animated.View style={[styles.logoWrap, { transform: [{ scale }] }]}>
        <View style={styles.logoFrame}>
          <Image
            source={SPLASH_LOGO}
            contentFit="contain"
            style={styles.logo}
            accessibilityLabel="شعار التطبيق"
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.splashBackground,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFrame: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
});
