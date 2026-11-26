import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  fetchUserCart,
  saveUserCart,
  type CartOwnerMeta,
} from '@/features/cart/api/cartApi';
import type { CartItem, DeliveryTimeSlot, PaymentMethod } from '@/types/domain';

let pendingSyncQueue: Promise<void> = Promise.resolve();

function enqueueCartSave(owner: CartOwnerMeta | null, items: CartItem[]) {
  if (!owner?.userId) return;
  const snapshot = [...items];
  const ownerSnapshot = { ...owner };
  pendingSyncQueue = pendingSyncQueue
    .then(() => saveUserCart(ownerSnapshot, snapshot))
    .catch(() => undefined);
}

interface CartState {
  ownerUserId: string | null;
  ownerMeta: CartOwnerMeta | null;
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
  clearSessionData: () => void;
  syncOwner: (owner: CartOwnerMeta | null) => void;
  loadUserCart: (owner: CartOwnerMeta) => Promise<void>;
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
      ownerUserId: null,
      ownerMeta: null,
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
        let next: CartItem[];
        if (existingIdx >= 0) {
          next = [...items];
          next[existingIdx] = {
            ...next[existingIdx],
            quantity: next[existingIdx].quantity + quantity,
          };
        } else {
          next = [...items, { ...item, quantity }];
        }
        set({ items: next });
        enqueueCartSave(get().ownerMeta, next);
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
        enqueueCartSave(get().ownerMeta, next);
      },

      removeItem: (productId, weightOptionId) => {
        const next = get().items.filter(
          (i) =>
            !(
              i.productId === productId &&
              (i.weightOptionId ?? null) === (weightOptionId ?? null)
            ),
        );
        set({ items: next });
        enqueueCartSave(get().ownerMeta, next);
      },

      clearCart: () => {
        set({ items: [], promoCode: null, discountAmount: 0 });
        enqueueCartSave(get().ownerMeta, []);
      },

      clearSessionData: () =>
        set({
          ownerUserId: null,
          ownerMeta: null,
          items: [],
          favoriteIds: [],
          promoCode: null,
          discountAmount: 0,
          selectedAddressId: '',
        }),

      syncOwner: (owner) => {
        if (!owner?.userId) {
          get().clearSessionData();
          return;
        }
        if (get().ownerUserId !== owner.userId) {
          set({
            ownerUserId: owner.userId,
            ownerMeta: owner,
            items: [],
            favoriteIds: [],
            promoCode: null,
            discountAmount: 0,
            selectedAddressId: '',
          });
        } else {
          set({ ownerMeta: owner });
        }
      },

      loadUserCart: async (owner) => {
        get().syncOwner(owner);
        try {
          const remoteItems = await fetchUserCart(owner.userId);
          if (get().ownerUserId === owner.userId) {
            set({ items: remoteItems });
          }
        } catch {
          // Keep current state if offline
        }
      },

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
