/**
 * Cart Firestore Service
 *
 * Handles CRUD operations for user shopping carts in Firestore.
 * Supports offline persistence and real-time synchronization.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Cart, CartOfferItem, CartProductItem } from '../../../shared/types/cart';

/**
 * Get user's cart from Firestore
 */
export const getCart = async (userId: string): Promise<Cart | null> => {
  try {
    const cartRef = doc(db, 'carts', userId);
    const cartSnap = await getDoc(cartRef);

    if (cartSnap.exists()) {
      return cartSnap.data() as Cart;
    }

    return null;
  } catch (error) {
    console.error('Error fetching cart:', error);
    throw error;
  }
};

/**
 * Create or update cart in Firestore
 */
export const saveCart = async (cart: Cart): Promise<void> => {
  try {
    const cartRef = doc(db, 'carts', cart.userId);

    await setDoc(cartRef, {
      ...cart,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error saving cart:', error);
    throw error;
  }
};

/**
 * Update specific cart fields
 */
export const updateCart = async (
  userId: string,
  updates: Partial<Cart>
): Promise<void> => {
  try {
    const cartRef = doc(db, 'carts', userId);

    await updateDoc(cartRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating cart:', error);
    throw error;
  }
};

/**
 * Add or update an offer item in the cart
 */
export const addOfferToCart = async (
  userId: string,
  offerItem: CartOfferItem
): Promise<void> => {
  try {
    const cart = await getCart(userId);

    if (!cart) {
      // Create new cart
      const newCart: Cart = {
        userId,
        offers: [offerItem],
        products: [],
        subtotal: offerItem.discountedTotal,
        totalSavings: offerItem.originalTotal - offerItem.discountedTotal,
        total: offerItem.discountedTotal,
        hasInvalidItems: false,
        invalidOfferIds: [],
        updatedAt: new Date() as any, // Will be replaced with serverTimestamp
      };

      await saveCart(newCart);
    } else {
      // Update existing cart
      const existingOfferIndex = cart.offers.findIndex(
        (o) => o.offerId === offerItem.offerId
      );

      if (existingOfferIndex >= 0) {
        // Update quantity of existing offer
        cart.offers[existingOfferIndex].quantity += offerItem.quantity;
        cart.offers[existingOfferIndex].discountedTotal += offerItem.discountedTotal;
        cart.offers[existingOfferIndex].originalTotal += offerItem.originalTotal;
      } else {
        // Add new offer
        cart.offers.push(offerItem);
      }

      // Recalculate totals
      recalculateCartTotals(cart);

      await saveCart(cart);
    }
  } catch (error) {
    console.error('Error adding offer to cart:', error);
    throw error;
  }
};

/**
 * Add or update a product item in the cart
 */
export const addProductToCart = async (
  userId: string,
  productItem: CartProductItem
): Promise<void> => {
  try {
    const cart = await getCart(userId);

    if (!cart) {
      // Create new cart
      const newCart: Cart = {
        userId,
        offers: [],
        products: [productItem],
        subtotal: productItem.totalPrice,
        totalSavings: 0,
        total: productItem.totalPrice,
        hasInvalidItems: false,
        invalidOfferIds: [],
        updatedAt: new Date() as any,
      };

      await saveCart(newCart);
    } else {
      // Update existing cart
      const existingProductIndex = cart.products.findIndex(
        (p) => p.productId === productItem.productId
      );

      if (existingProductIndex >= 0) {
        // Update quantity of existing product
        cart.products[existingProductIndex].quantity += productItem.quantity;
        cart.products[existingProductIndex].totalPrice += productItem.totalPrice;
      } else {
        // Add new product
        cart.products.push(productItem);
      }

      // Recalculate totals
      recalculateCartTotals(cart);

      await saveCart(cart);
    }
  } catch (error) {
    console.error('Error adding product to cart:', error);
    throw error;
  }
};

/**
 * Update offer quantity in cart
 */
export const updateOfferQuantity = async (
  userId: string,
  offerId: string,
  quantity: number
): Promise<void> => {
  try {
    const cart = await getCart(userId);
    if (!cart) return;

    const offerIndex = cart.offers.findIndex((o) => o.offerId === offerId);
    if (offerIndex < 0) return;

    if (quantity <= 0) {
      // Remove offer
      cart.offers.splice(offerIndex, 1);
    } else {
      // Update quantity
      const offer = cart.offers[offerIndex];
      const pricePerUnit = offer.discountedTotal / offer.quantity;
      const originalPricePerUnit = offer.originalTotal / offer.quantity;

      offer.quantity = quantity;
      offer.discountedTotal = quantity * pricePerUnit;
      offer.originalTotal = quantity * originalPricePerUnit;
    }

    recalculateCartTotals(cart);
    await saveCart(cart);
  } catch (error) {
    console.error('Error updating offer quantity:', error);
    throw error;
  }
};

/**
 * Update product quantity in cart
 */
export const updateProductQuantity = async (
  userId: string,
  productId: string,
  quantity: number
): Promise<void> => {
  try {
    const cart = await getCart(userId);
    if (!cart) return;

    const productIndex = cart.products.findIndex((p) => p.productId === productId);
    if (productIndex < 0) return;

    if (quantity <= 0) {
      // Remove product
      cart.products.splice(productIndex, 1);
    } else {
      // Update quantity
      const product = cart.products[productIndex];
      product.quantity = quantity;
      product.totalPrice = quantity * product.pricePerUnit;
    }

    recalculateCartTotals(cart);
    await saveCart(cart);
  } catch (error) {
    console.error('Error updating product quantity:', error);
    throw error;
  }
};

/**
 * Remove offer from cart
 */
export const removeOfferFromCart = async (
  userId: string,
  offerId: string
): Promise<void> => {
  try {
    const cart = await getCart(userId);
    if (!cart) return;

    cart.offers = cart.offers.filter((o) => o.offerId !== offerId);

    // Remove from invalid list if present
    cart.invalidOfferIds = cart.invalidOfferIds.filter((id) => id !== offerId);

    // Check if we still have invalid items
    if (cart.invalidOfferIds.length === 0) {
      cart.hasInvalidItems = false;
    }

    recalculateCartTotals(cart);
    await saveCart(cart);
  } catch (error) {
    console.error('Error removing offer from cart:', error);
    throw error;
  }
};

/**
 * Remove product from cart
 */
export const removeProductFromCart = async (
  userId: string,
  productId: string
): Promise<void> => {
  try {
    const cart = await getCart(userId);
    if (!cart) return;

    cart.products = cart.products.filter((p) => p.productId !== productId);

    recalculateCartTotals(cart);
    await saveCart(cart);
  } catch (error) {
    console.error('Error removing product from cart:', error);
    throw error;
  }
};

/**
 * Clear entire cart
 */
export const clearCart = async (userId: string): Promise<void> => {
  try {
    const cartRef = doc(db, 'carts', userId);
    await deleteDoc(cartRef);
  } catch (error) {
    console.error('Error clearing cart:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time cart updates
 */
export const subscribeToCart = (
  userId: string,
  onUpdate: (cart: Cart | null) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const cartRef = doc(db, 'carts', userId);

  return onSnapshot(
    cartRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as Cart);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      console.error('Error in cart subscription:', error);
      if (onError) {
        onError(error as Error);
      }
    }
  );
};

/**
 * Helper: Recalculate cart totals
 */
const recalculateCartTotals = (cart: Cart): void => {
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
};

/**
 * Validate cart against current offers and products
 * This is a client-side pre-validation before calling the Cloud Function
 */
export const validateCartLocally = async (cart: Cart): Promise<{
  isValid: boolean;
  errors: string[];
}> => {
  const errors: string[] = [];

  // Check if cart has any items
  if (cart.offers.length === 0 && cart.products.length === 0) {
    errors.push('Cart is empty');
  }

  // Check for invalid items flag
  if (cart.hasInvalidItems) {
    errors.push('Cart contains invalid or changed offers. Please review and remove them.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
