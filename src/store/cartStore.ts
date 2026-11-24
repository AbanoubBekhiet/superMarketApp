import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CartItem, DeliveryTimeSlot, PaymentMethod } from '@/types/domain';

const INITIAL_CART_ITEMS: CartItem[] = [
  {
    productId: 'prd-1',
    weightOptionId: 'w-1-1000',
    name: 'طماطم بلدي عضوية (1 كجم)',
    imageKey: 'prod-tomatoes',
    unitLabel: '1 كجم',
    unitPrice: 24,
    quantity: 2,
  },
  {
    productId: 'prd-3',
    weightOptionId: 'w-3-1000',
    name: 'حليب مزرعة طازج (1 لتر)',
    imageKey: 'prod-milk',
    unitLabel: '1 لتر',
    unitPrice: 48,
    quantity: 1,
  },
  {
    productId: 'prd-5',
    weightOptionId: 'w-5-500',
    name: 'عسل نحل بري صافي (500 جم)',
    imageKey: 'prod-honey',
    unitLabel: '500 جم',
    unitPrice: 185,
    quantity: 1,
  },
];

interface CartState {
  items: CartItem[];
  favoriteIds: string[];
  promoCode: string | null;
  discountAmount: number;
  deliverySlot: DeliveryTimeSlot;
  paymentMethod: PaymentMethod;
  selectedAddressId: string;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  updateQuantity: (productId: string, weightOptionId: string, delta: number) => void;
  removeItem: (productId: string, weightOptionId: string) => void;
  clearCart: () => void;
  applyPromo: (code: string) => boolean;
  setDeliverySlot: (slot: DeliveryTimeSlot) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setSelectedAddressId: (id: string) => void;
  toggleFavorite: (productId: string) => boolean;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: INITIAL_CART_ITEMS,
      favoriteIds: ['prd-1', 'prd-3'],
      promoCode: 'طازج30',
      discountAmount: 30,
      deliverySlot: 'instant',
      paymentMethod: 'cod',
      selectedAddressId: 'addr-1',

      addItem: (item, quantity = 1) => {
        const items = get().items;
        const existingIdx = items.findIndex(
          (i) => i.productId === item.productId && i.weightOptionId === item.weightOptionId,
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
            if (item.productId === productId && item.weightOptionId === weightOptionId) {
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
            (i) => !(i.productId === productId && i.weightOptionId === weightOptionId),
          ),
        });
      },

      clearCart: () => set({ items: [], promoCode: null, discountAmount: 0 }),

      applyPromo: (code) => {
        const normalized = code.trim();
        if (normalized === 'طازج30' || normalized === 'طازج') {
          set({ promoCode: normalized, discountAmount: 30 });
          return true;
        }
        return false;
      },

      setDeliverySlot: (deliverySlot) => set({ deliverySlot }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setSelectedAddressId: (selectedAddressId) => set({ selectedAddressId }),

      toggleFavorite: (productId) => {
        const current = get().favoriteIds;
        const exists = current.includes(productId);
        const next = exists ? current.filter((id) => id !== productId) : [...current, productId];
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
