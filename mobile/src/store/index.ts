/**
 * Zustand Store Configuration
 *
 * Central state management for cart and auth state.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../../../shared/types/user';
import type { Cart, CartOfferItem, CartProductItem } from '../../../shared/types/cart';

// Auth Store Interface
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

// Cart Store Interface
interface CartState {
  cart: Cart | null;
  itemCount: number;
  setCart: (cart: Cart | null) => void;
  addOfferItem: (item: CartOfferItem) => void;
  addProductItem: (item: CartProductItem) => void;
  updateOfferQuantity: (offerId: string, quantity: number) => void;
  updateProductQuantity: (productId: string, quantity: number) => void;
  removeOfferItem: (offerId: string) => void;
  removeProductItem: (productId: string) => void;
  clearCart: () => void;
  calculateTotals: () => void;
}

// Auth Store
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setLoading: (isLoading) =>
        set({ isLoading }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Cart Store
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: null,
      itemCount: 0,

      setCart: (cart) => {
        const itemCount = cart
          ? (cart.offers?.length || 0) + (cart.products?.length || 0)
          : 0;
        set({ cart, itemCount });
      },

      addOfferItem: (item) => {
        const currentCart = get().cart;
        const userId = useAuthStore.getState().user?.uid;

        if (!userId) {
          console.error('Cannot add item to cart: User not authenticated');
          return;
        }

        const newCart: Cart = currentCart || {
          userId,
          offers: [],
          products: [],
          subtotal: 0,
          totalSavings: 0,
          total: 0,
          hasInvalidItems: false,
          invalidOfferIds: [],
          updatedAt: new Date() as any, // Firestore Timestamp will be set on server
        };

        // Check if offer already exists
        const existingIndex = newCart.offers.findIndex(o => o.offerId === item.offerId);
        if (existingIndex >= 0) {
          newCart.offers[existingIndex].quantity += item.quantity;
          newCart.offers[existingIndex].discountedTotal =
            newCart.offers[existingIndex].quantity * item.discountedTotal / item.quantity;
          newCart.offers[existingIndex].originalTotal =
            newCart.offers[existingIndex].quantity * item.originalTotal / item.quantity;
        } else {
          newCart.offers.push(item);
        }

        get().calculateTotals();
        set({ cart: newCart });
      },

      addProductItem: (item) => {
        const currentCart = get().cart;
        const userId = useAuthStore.getState().user?.uid;

        if (!userId) {
          console.error('Cannot add item to cart: User not authenticated');
          return;
        }

        const newCart: Cart = currentCart || {
          userId,
          offers: [],
          products: [],
          subtotal: 0,
          totalSavings: 0,
          total: 0,
          hasInvalidItems: false,
          invalidOfferIds: [],
          updatedAt: new Date() as any,
        };

        // Check if product already exists
        const existingIndex = newCart.products.findIndex(p => p.productId === item.productId);
        if (existingIndex >= 0) {
          newCart.products[existingIndex].quantity += item.quantity;
          newCart.products[existingIndex].totalPrice =
            newCart.products[existingIndex].quantity * item.pricePerUnit;
        } else {
          newCart.products.push(item);
        }

        get().calculateTotals();
        set({ cart: newCart });
      },

      updateOfferQuantity: (offerId, quantity) => {
        const cart = get().cart;
        if (!cart) return;

        const offerIndex = cart.offers.findIndex(o => o.offerId === offerId);
        if (offerIndex >= 0) {
          if (quantity <= 0) {
            cart.offers.splice(offerIndex, 1);
          } else {
            const pricePerUnit = cart.offers[offerIndex].discountedTotal / cart.offers[offerIndex].quantity;
            const originalPricePerUnit = cart.offers[offerIndex].originalTotal / cart.offers[offerIndex].quantity;
            cart.offers[offerIndex].quantity = quantity;
            cart.offers[offerIndex].discountedTotal = quantity * pricePerUnit;
            cart.offers[offerIndex].originalTotal = quantity * originalPricePerUnit;
          }

          get().calculateTotals();
          set({ cart: { ...cart } });
        }
      },

      updateProductQuantity: (productId, quantity) => {
        const cart = get().cart;
        if (!cart) return;

        const productIndex = cart.products.findIndex(p => p.productId === productId);
        if (productIndex >= 0) {
          if (quantity <= 0) {
            cart.products.splice(productIndex, 1);
          } else {
            cart.products[productIndex].quantity = quantity;
            cart.products[productIndex].totalPrice =
              quantity * cart.products[productIndex].pricePerUnit;
          }

          get().calculateTotals();
          set({ cart: { ...cart } });
        }
      },

      removeOfferItem: (offerId) => {
        const cart = get().cart;
        if (!cart) return;

        cart.offers = cart.offers.filter(o => o.offerId !== offerId);
        get().calculateTotals();
        set({ cart: { ...cart } });
      },

      removeProductItem: (productId) => {
        const cart = get().cart;
        if (!cart) return;

        cart.products = cart.products.filter(p => p.productId !== productId);
        get().calculateTotals();
        set({ cart: { ...cart } });
      },

      clearCart: () => {
        set({ cart: null, itemCount: 0 });
      },

      calculateTotals: () => {
        const cart = get().cart;
        if (!cart) return;

        // Calculate subtotal from all items
        const offerTotal = cart.offers.reduce((sum, offer) => sum + offer.discountedTotal, 0);
        const productTotal = cart.products.reduce((sum, product) => sum + product.totalPrice, 0);
        cart.subtotal = offerTotal + productTotal;

        // Calculate total savings from offers
        cart.totalSavings = cart.offers.reduce(
          (sum, offer) => sum + (offer.originalTotal - offer.discountedTotal),
          0
        );

        // Final total (subtotal already includes discounts)
        cart.total = cart.subtotal;

        // Update item count
        const itemCount = cart.offers.length + cart.products.length;

        set({ cart: { ...cart }, itemCount });
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
