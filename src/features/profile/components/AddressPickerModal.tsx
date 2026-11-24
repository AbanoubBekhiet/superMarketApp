import { X } from 'lucide-react-native';
import { Modal, Pressable, Text, View } from 'react-native';
import { STRINGS } from '@/constants/strings';
import { colors } from '@/theme/tokens';
import type { Address } from '@/types/domain';

interface AddressPickerModalProps {
  visible: boolean;
  addresses: Address[];
  onClose: () => void;
  onSelectAddress: (addressId: string) => void;
}

/**
 * Shared bottom-sheet modal allowing customers to switch their default delivery address.
 */
export function AddressPickerModal({
  visible,
  addresses,
  onClose,
  onSelectAddress,
}: AddressPickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-on-surface/40 justify-end" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-surface-card rounded-t-xl p-lg gap-md border-t border-outline-subtle"
        >
          <View className="flex-row items-center justify-between pb-sm border-b border-outline-subtle">
            <Text className="font-headline text-title-lg text-on-surface">
              {STRINGS.home.chooseAddressTitle}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.common.close}
              hitSlop={8}
            >
              <X size={20} color={colors.onSurfaceMuted} />
            </Pressable>
          </View>
          {addresses.map((addr) => (
            <Pressable
              key={addr.id}
              onPress={() => {
                onSelectAddress(addr.id);
                onClose();
              }}
              className={`p-md rounded-lg border flex-row items-center justify-between ${
                addr.isDefault
                  ? 'bg-mint-surface border-primary'
                  : 'bg-surface border-outline-subtle'
              }`}
            >
              <View className="gap-xs flex-1">
                <Text className="font-title text-title-sm text-on-surface text-right">
                  {addr.label} — {addr.area}
                </Text>
                <Text className="font-body text-body-sm text-on-surface-muted text-right">
                  {addr.street}، {addr.city}
                </Text>
              </View>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
