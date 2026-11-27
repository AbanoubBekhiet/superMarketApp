import { router } from 'expo-router';
import { ArrowRight, Headset, Megaphone, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { STRINGS } from '@/constants/strings';
import {
  useAppSettings,
  useBanners,
  useCreateBanner,
  useDeleteBanner,
  useUpdateAppSetting,
} from '@/features/profile/hooks/useProfile';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/theme/tokens';

/**
 * Dedicated admin screen for Store Support Phone Settings and Promotional Banners.
 */
export function AdminSettingsScreen() {
  const showToast = useUiStore((s) => s.showToast);

  const { data: settings = [] } = useAppSettings();
  const { mutateAsync: updateSetting, isPending: savingSetting } = useUpdateAppSetting();
  const { data: banners = [] } = useBanners();
  const { mutateAsync: addBanner, isPending: savingBanner } = useCreateBanner();
  const { mutateAsync: removeBanner } = useDeleteBanner();

  const [supportPhoneDraft, setSupportPhoneDraft] = useState<string | null>(null);
  const [bannerTag, setBannerTag] = useState('عرض خاص');
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');

  const currentSupportPhone =
    settings.find((s) => s.key === 'support_phone')?.value ?? '+20 102 458 9120';
  const supportPhoneValue = supportPhoneDraft ?? currentSupportPhone;

  const handleSaveSupportPhone = async () => {
    const clean = supportPhoneValue.trim();
    if (!clean) {
      showToast(STRINGS.common.requiredField, 'error');
      return;
    }
    try {
      await updateSetting({
        key: 'support_phone',
        value: clean,
        description: 'رقم خدمة العملاء',
      });
      setSupportPhoneDraft(null);
      showToast(STRINGS.admin.supportPhoneSaved);
    } catch {
      showToast(STRINGS.common.errorMessage, 'error');
    }
  };

  const handleAddBanner = async () => {
    if (!bannerTitle.trim() || !bannerSubtitle.trim()) {
      showToast(STRINGS.common.requiredField, 'error');
      return;
    }
    try {
      await addBanner({
        tag: bannerTag.trim() || 'عرض خاص',
        title: bannerTitle.trim(),
        subtitle: bannerSubtitle.trim(),
        sortOrder: banners.length + 1,
      });
      setBannerTitle('');
      setBannerSubtitle('');
      showToast(STRINGS.admin.bannerSaved);
    } catch {
      showToast(STRINGS.common.errorMessage, 'error');
    }
  };

  const handleDeleteBanner = async (id: string) => {
    try {
      await removeBanner(id);
      showToast(STRINGS.admin.bannerDeleted);
    } catch {
      showToast(STRINGS.common.errorMessage, 'error');
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <ScreenHeader
        title={STRINGS.admin.settingsScreenTitle}
        rightSlot={
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={STRINGS.common.back}
            className="w-9 h-9 rounded-full bg-surface-card border border-outline-subtle items-center justify-center active:bg-mint-surface"
          >
            <ArrowRight size={18} color={colors.onSurface} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerClassName="px-page-x pt-base pb-xl gap-section"
        showsVerticalScrollIndicator={false}
      >
        {/* Store Support Phone Setting */}
        <Card className="gap-md">
          <View className="flex-row items-center gap-sm pb-sm border-b border-outline-subtle">
            <Headset size={18} color={colors.primary} />
            <Text className="font-headline text-title-md text-on-surface">
              {STRINGS.admin.storeSettingsTitle}
            </Text>
          </View>
          <Input
            label={STRINGS.admin.supportPhoneLabel}
            placeholder={STRINGS.admin.supportPhonePlaceholder}
            value={supportPhoneValue}
            onChangeText={setSupportPhoneDraft}
            keyboardType="phone-pad"
          />
          <Button
            variant="primary"
            size="md"
            isLoading={savingSetting}
            label={STRINGS.common.save}
            onPress={handleSaveSupportPhone}
          />
        </Card>

        {/* Banners Management */}
        <Card className="gap-md">
          <View className="flex-row items-center gap-sm pb-sm border-b border-outline-subtle">
            <Megaphone size={18} color={colors.primary} />
            <Text className="font-headline text-title-md text-on-surface">
              {STRINGS.admin.bannersTitle}
            </Text>
          </View>

          <Input
            placeholder={STRINGS.admin.bannerTagPlaceholder}
            value={bannerTag}
            onChangeText={setBannerTag}
          />
          <Input
            placeholder={STRINGS.admin.bannerTitlePlaceholder}
            value={bannerTitle}
            onChangeText={setBannerTitle}
          />
          <Input
            placeholder={STRINGS.admin.bannerSubtitlePlaceholder}
            value={bannerSubtitle}
            onChangeText={setBannerSubtitle}
          />
          <Button
            variant="mint"
            size="md"
            isLoading={savingBanner}
            onPress={handleAddBanner}
          >
            <Plus size={16} color={colors.primary} />
            <Text className="font-label-bold text-label-md text-on-mint-surface">
              {STRINGS.admin.addBannerBtn}
            </Text>
          </Button>

          {banners.length > 0 ? (
            <View className="gap-xs pt-xs border-t border-outline-subtle">
              {banners.map((b) => (
                <View
                  key={b.id}
                  className="py-sm flex-row items-center justify-between gap-sm border-b border-outline-subtle"
                >
                  <View className="flex-1 min-w-0 gap-xs">
                    <Text className="font-title text-title-sm text-on-surface text-right" numberOfLines={1}>
                      {b.title}
                    </Text>
                    <Text className="font-body text-body-sm text-on-surface-subtle text-right" numberOfLines={1}>
                      {b.subtitle}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleDeleteBanner(b.id)}
                    hitSlop={8}
                    accessibilityLabel={STRINGS.common.delete}
                    className="w-8 h-8 rounded-full bg-surface items-center justify-center"
                  >
                    <Trash2 size={16} color={colors.error} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
