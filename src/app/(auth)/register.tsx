import { zodResolver } from '@hookform/resolvers/zod';
import * as Location from 'expo-location';
import { Link } from 'expo-router';
import {
  CheckCircle2,
  LocateFixed,
  Lock,
  MapPin,
  Phone,
  User as UserIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { STRINGS } from '@/constants/strings';
import { useMobileRegister } from '@/features/auth/hooks/useAuth';
import { isValidPhoneNumber } from '@/lib/phoneAuth';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';

const registerSchema = z.object({
  name: z.string().trim().min(3, STRINGS.auth.validation.nameMin),
  phone: z.string().trim().refine(isValidPhoneNumber, STRINGS.auth.validation.phoneInvalid),
  area: z.string().trim().min(2, STRINGS.auth.validation.areaMin),
  street: z.string().trim().optional(),
  password: z.string().min(6, STRINGS.auth.validation.passwordMin),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const { mutateAsync: register, isPending } = useMobileRegister();
  const showToast = useUiStore((s) => s.showToast);

  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      phone: '',
      area: '',
      street: '',
      password: '',
    },
  });

  const handleDetectLocation = async () => {
    setLocating(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError(STRINGS.auth.locationPermissionDenied);
        showToast(STRINGS.auth.locationPermissionDenied, 'error');
        return;
      }

      let position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).catch(() => null);

      if (!position) {
        position = await Location.getLastKnownPositionAsync().catch(() => null);
      }

      if (!position) {
        setLocationError(STRINGS.auth.locationFailed);
        showToast(STRINGS.auth.locationFailed, 'error');
        return;
      }

      const { latitude, longitude } = position.coords;
      setCoords({ latitude, longitude });

      showToast(STRINGS.auth.locationDetected);
    } catch {
      setLocationError(STRINGS.auth.locationFailed);
      showToast(STRINGS.auth.locationFailed, 'error');
    } finally {
      setLocating(false);
    }
  };

  const onSubmit = async (values: RegisterFormValues) => {
    if (!coords) {
      setLocationError(STRINGS.auth.validation.locationRequired);
      showToast(STRINGS.auth.validation.locationRequired, 'error');
      return;
    }
    try {
      await register({
        ...values,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      showToast(STRINGS.auth.registerSuccess);
    } catch (err) {
      const msg = err instanceof Error ? err.message : STRINGS.common.errorMessage;
      showToast(msg || STRINGS.common.errorMessage, 'error');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-page-x py-xl gap-lg"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-xs">
            <Text className="font-headline text-headline-lg text-on-surface text-right">
              {STRINGS.auth.registerTitle}
            </Text>
            <Text className="font-body text-body-md text-on-surface-muted text-right">
              {STRINGS.auth.registerSubtitle}
            </Text>
          </View>

          <Card className="gap-md">
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={STRINGS.auth.nameLabel}
                  placeholder={STRINGS.auth.namePlaceholder}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.name?.message}
                  startIcon={<UserIcon size={18} color={colors.onSurfaceSubtle} />}
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={STRINGS.auth.phoneLabel}
                  placeholder={STRINGS.auth.phonePlaceholder}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="phone-pad"
                  error={errors.phone?.message}
                  startIcon={<Phone size={18} color={colors.onSurfaceSubtle} />}
                />
              )}
            />

            <Controller
              control={control}
              name="area"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={STRINGS.auth.areaLabel}
                  placeholder={STRINGS.auth.areaPlaceholder}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.area?.message}
                  startIcon={<MapPin size={18} color={colors.onSurfaceSubtle} />}
                />
              )}
            />

            <Controller
              control={control}
              name="street"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={STRINGS.auth.streetLabel}
                  placeholder={STRINGS.auth.streetPlaceholder}
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  startIcon={<MapPin size={18} color={colors.onSurfaceSubtle} />}
                />
              )}
            />

            {/* GPS Location Picker */}
            <View className="gap-xs">
              <Text className="font-label text-label-md text-on-surface text-right">
                {STRINGS.auth.locationSectionLabel}
              </Text>
              <View
                className={`p-md rounded-md border gap-sm ${
                  coords
                    ? 'bg-mint-surface border-primary'
                    : locationError
                      ? 'bg-error-container border-error'
                      : 'bg-surface border-outline-subtle'
                }`}
              >
                <View className="flex-row items-center justify-between gap-sm">
                  <View className="flex-row items-center gap-xs flex-1">
                    {coords ? (
                      <CheckCircle2 size={18} color={colors.primary} />
                    ) : (
                      <LocateFixed size={18} color={colors.onSurfaceMuted} />
                    )}
                    <Text
                      className={`font-body text-body-sm flex-1 text-right ${
                        coords ? 'text-on-mint-surface' : 'text-on-surface-muted'
                      }`}
                    >
                      {coords
                        ? STRINGS.auth.locationDetected
                        : STRINGS.auth.locationNotSet}
                    </Text>
                  </View>
                </View>

                <Button
                  variant={coords ? 'mint-outline' : 'mint'}
                  size="md"
                  isLoading={locating}
                  onPress={handleDetectLocation}
                >
                  <LocateFixed size={16} color={colors.primary} />
                  <Text className="font-label-bold text-label-md text-primary">
                    {locating ? STRINGS.auth.detectingLocation : STRINGS.auth.detectLocationBtn}
                  </Text>
                </Button>
              </View>
              {locationError ? (
                <Text className="font-body text-body-sm text-error text-right">
                  {locationError}
                </Text>
              ) : null}
            </View>

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={STRINGS.auth.passwordLabel}
                  placeholder={STRINGS.auth.passwordPlaceholder}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  error={errors.password?.message}
                  startIcon={<Lock size={18} color={colors.onSurfaceSubtle} />}
                />
              )}
            />

            <Button
              variant="primary"
              size="lg"
              label={STRINGS.auth.registerButton}
              isLoading={isPending}
              onPress={() => handleSubmit(onSubmit)()}
              className="mt-xs"
            />

            <View className="flex-row items-center justify-center gap-xs pt-xs">
              <Text className="font-body text-body-md text-on-surface-muted">
                {STRINGS.auth.hasAccount}
              </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable hitSlop={8}>
                  <Text className="font-label-bold text-label-md text-primary">
                    {STRINGS.auth.loginLink}
                  </Text>
                </Pressable>
              </Link>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
