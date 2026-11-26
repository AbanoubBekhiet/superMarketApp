import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Lock, Phone } from 'lucide-react-native';
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
import { useMobileLogin } from '@/features/auth/hooks/useAuth';
import { getLocalImage } from '@/lib/images';
import { isValidPhoneNumber } from '@/lib/phoneAuth';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';

const loginSchema = z.object({
  phone: z.string().trim().refine(isValidPhoneNumber, STRINGS.auth.validation.phoneInvalid),
  password: z.string().min(6, STRINGS.auth.validation.passwordMin),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { mutateAsync: login, isPending } = useMobileLogin();
  const showToast = useUiStore((s) => s.showToast);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values);
      showToast(STRINGS.auth.loginSuccess);
    } catch (err) {
      const msg = err instanceof Error ? err.message : STRINGS.auth.invalidCredentials;
      showToast(msg || STRINGS.auth.invalidCredentials, 'error');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-page-x py-xl gap-xl"
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand Header */}
          <View className="items-center gap-sm">
            <View className="w-16 h-16 rounded-xl overflow-hidden border border-outline-subtle bg-surface-card">
              <Image
                source={getLocalImage('local://logo')}
                contentFit="cover"
                style={{ width: '100%', height: '100%' }}
                accessibilityLabel={STRINGS.brand.name}
              />
            </View>
            <Text className="font-headline text-display-lg-mobile text-on-surface">
              {STRINGS.brand.name}
            </Text>
            <Text className="font-body text-body-md text-on-surface-muted text-center">
              {STRINGS.auth.loginSubtitle}
            </Text>
          </View>

          {/* Login Form */}
          <Card className="gap-base">
            <Text className="font-headline text-headline-md text-on-surface text-right">
              {STRINGS.auth.loginTitle}
            </Text>

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
                  autoCapitalize="none"
                  keyboardType="phone-pad"
                  error={errors.phone?.message}
                  startIcon={<Phone size={18} color={colors.onSurfaceSubtle} />}
                />
              )}
            />

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
              label={STRINGS.auth.loginButton}
              isLoading={isPending}
              onPress={() => handleSubmit(onSubmit)()}
            />

            <View className="flex-row items-center justify-center gap-xs pt-xs">
              <Text className="font-body text-body-md text-on-surface-muted">
                {STRINGS.auth.noAccount}
              </Text>
              <Link href="/(auth)/register" asChild>
                <Pressable hitSlop={8}>
                  <Text className="font-label-bold text-label-md text-primary">
                    {STRINGS.auth.createAccountLink}
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
