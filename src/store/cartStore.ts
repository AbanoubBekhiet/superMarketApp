import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CartItem, DeliveryTimeSlot, PaymentMethod } from '@/types/domain';

interface CartState {
  items: CartItem[];
  favoriteIds: string[];
  promoCode: string | null;
  discountAmount: number;
  deliverySlot: DeliveryTimeSlot;
  paymentMethod: PaymentMethod;
  selectedAddressId: string;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  updateQuantity: (productId: string, weightOptionId: string | null | undefined, delta: number) => void;
  removeItem: (productId: string, weightOptionId?: string | null) => void;
  clearCart: () => void;
  setPromoDiscount: (code: string | null, amount: number) => void;
  setDeliverySlot: (slot: DeliveryTimeSlot) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setSelectedAddressId: (id: string) => void;
  setFavoriteIds: (ids: string[]) => void;
  toggleFavoriteLocal: (productId: string) => boolean;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      favoriteIds: [],
      promoCode: null,
      discountAmount: 0,
      deliverySlot: 'instant',
      paymentMethod: 'cod',
      selectedAddressId: '',

      addItem: (item, quantity = 1) => {
        const items = get().items;
        const existingIdx = items.findIndex(
          (i) =>
            i.productId === item.productId &&
            (i.weightOptionId ?? null) === (item.weightOptionId ?? null),
        );
        if (existingIdx >= 0) {
          const next = [...items];
          next[existingIdx] = {
            ...next[existingIdx],
            quantity: next[existingIdx].quantity + quantity,
          };
          set({ items: next });
        } else {
          set({ items: [...items, { ...item, quantity }] });
        }
      },

      updateQuantity: (productId, weightOptionId, delta) => {
        const next = get()
          .items.map((item) => {
            if (
              item.productId === productId &&
              (item.weightOptionId ?? null) === (weightOptionId ?? null)
            ) {
              return { ...item, quantity: item.quantity + delta };
            }
            return item;
          })
          .filter((item) => item.quantity > 0);
        set({ items: next });
      },

      removeItem: (productId, weightOptionId) => {
        set({
          items: get().items.filter(
            (i) =>
              !(
                i.productId === productId &&
                (i.weightOptionId ?? null) === (weightOptionId ?? null)
              ),
          ),
        });
      },

      clearCart: () => set({ items: [], promoCode: null, discountAmount: 0 }),

      setPromoDiscount: (promoCode, discountAmount) => set({ promoCode, discountAmount }),
      setDeliverySlot: (deliverySlot) => set({ deliverySlot }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setSelectedAddressId: (selectedAddressId) => set({ selectedAddressId }),
      setFavoriteIds: (favoriteIds) => set({ favoriteIds }),

      toggleFavoriteLocal: (productId) => {
        const current = get().favoriteIds;
        const exists = current.includes(productId);
        const next = exists
          ? current.filter((id) => id !== productId)
          : [...current, productId];
        set({ favoriteIds: next });
        return !exists;
      },
    }),
    {
      name: 'tazaj-cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
