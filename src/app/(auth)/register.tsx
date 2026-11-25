import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Lock, MapPin, Phone, User as UserIcon } from 'lucide-react-native';
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
  password: z.string().min(6, STRINGS.auth.validation.passwordMin),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const { mutateAsync: register, isPending } = useMobileRegister();
  const showToast = useUiStore((s) => s.showToast);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      phone: '',
      area: 'سموحة، الإسكندرية',
      password: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await register(values);
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
