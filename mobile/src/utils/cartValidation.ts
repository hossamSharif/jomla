/**
 * Cart Validation Utility
 *
 * Validates cart items against quantity limits and product/offer availability.
 * This provides client-side validation for better UX before server-side validation.
 */

import type { Cart, CartOfferItem, CartProductItem } from '../../../shared/types/cart';
import type { Offer } from '../../../shared/types/offer';
import type { Product } from '../../../shared/types/product';

export interface ValidationError {
  type: 'offer_unavailable' | 'offer_changed' | 'quantity_exceeded' | 'quantity_below_min' | 'product_unavailable' | 'product_out_of_stock';
  itemId: string;
  itemName: string;
  message: string;
  maxAllowed?: number;
  minRequired?: number;
}

export interface CartValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate an offer item against the current offer data
 */
export const validateOfferItem = (
  cartItem: CartOfferItem,
  currentOffer: Offer | null
): ValidationError | null => {
  // Check if offer exists
  if (!currentOffer) {
    return {
      type: 'offer_unavailable',
      itemId: cartItem.offerId,
      itemName: cartItem.offerName,
      message: `Offer "${cartItem.offerName}" is no longer available`,
    };
  }

  // Check if offer is active
  if (currentOffer.status !== 'active') {
    return {
      type: 'offer_unavailable',
      itemId: cartItem.offerId,
      itemName: cartItem.offerName,
      message: `Offer "${cartItem.offerName}" is no longer active`,
    };
  }

  // Check validity period
  const now = new Date();
  if (currentOffer.validFrom && currentOffer.validFrom.toDate() > now) {
    return {
      type: 'offer_unavailable',
      itemId: cartItem.offerId,
      itemName: cartItem.offerName,
      message: `Offer "${cartItem.offerName}" is not yet valid`,
    };
  }

  if (currentOffer.validUntil && currentOffer.validUntil.toDate() < now) {
    return {
      type: 'offer_unavailable',
      itemId: cartItem.offerId,
      itemName: cartItem.offerName,
      message: `Offer "${cartItem.offerName}" has expired`,
    };
  }

  // Check if offer price has changed
  if (cartItem.discountedTotal / cartItem.quantity !== currentOffer.discountedTotal) {
    return {
      type: 'offer_changed',
      itemId: cartItem.offerId,
      itemName: cartItem.offerName,
      message: `Price for "${cartItem.offerName}" has changed. Please remove and re-add to cart.`,
    };
  }

  // Check quantity limits
  if (cartItem.quantity < currentOffer.minQuantity) {
    return {
      type: 'quantity_below_min',
      itemId: cartItem.offerId,
      itemName: cartItem.offerName,
      message: `Minimum quantity for "${cartItem.offerName}" is ${currentOffer.minQuantity}`,
      minRequired: currentOffer.minQuantity,
    };
  }

  if (cartItem.quantity > currentOffer.maxQuantity) {
    return {
      type: 'quantity_exceeded',
      itemId: cartItem.offerId,
      itemName: cartItem.offerName,
      message: `Maximum quantity for "${cartItem.offerName}" is ${currentOffer.maxQuantity}`,
      maxAllowed: currentOffer.maxQuantity,
    };
  }

  return null;
};

/**
 * Validate a product item against the current product data
 */
export const validateProductItem = (
  cartItem: CartProductItem,
  currentProduct: Product | null
): ValidationError | null => {
  // Check if product exists
  if (!currentProduct) {
    return {
      type: 'product_unavailable',
      itemId: cartItem.productId,
      itemName: cartItem.productName,
      message: `Product "${cartItem.productName}" is no longer available`,
    };
  }

  // Check if product is active
  if (currentProduct.status !== 'active') {
    return {
      type: 'product_unavailable',
      itemId: cartItem.productId,
      itemName: cartItem.productName,
      message: `Product "${cartItem.productName}" is no longer active`,
    };
  }

  // Check stock availability
  if (!currentProduct.inStock) {
    return {
      type: 'product_out_of_stock',
      itemId: cartItem.productId,
      itemName: cartItem.productName,
      message: `Product "${cartItem.productName}" is out of stock`,
    };
  }

  // Check quantity limits
  if (cartItem.quantity < currentProduct.minQuantity) {
    return {
      type: 'quantity_below_min',
      itemId: cartItem.productId,
      itemName: cartItem.productName,
      message: `Minimum quantity for "${cartItem.productName}" is ${currentProduct.minQuantity}`,
      minRequired: currentProduct.minQuantity,
    };
  }

  if (cartItem.quantity > currentProduct.maxQuantity) {
    return {
      type: 'quantity_exceeded',
      itemId: cartItem.productId,
      itemName: cartItem.productName,
      message: `Maximum quantity for "${cartItem.productName}" is ${currentProduct.maxQuantity}`,
      maxAllowed: currentProduct.maxQuantity,
    };
  }

  return null;
};

/**
 * Validate entire cart
 * This should be called with fresh offer/product data from Firestore
 */
export const validateCart = (
  cart: Cart,
  currentOffers: Map<string, Offer>,
  currentProducts: Map<string, Product>
): CartValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check if cart is empty
  if (cart.offers.length === 0 && cart.products.length === 0) {
    return {
      isValid: false,
      errors: [{
        type: 'offer_unavailable',
        itemId: '',
        itemName: '',
        message: 'Cart is empty',
      }],
      warnings: [],
    };
  }

  // Validate offers
  for (const offerItem of cart.offers) {
    const currentOffer = currentOffers.get(offerItem.offerId);
    const error = validateOfferItem(offerItem, currentOffer || null);

    if (error) {
      // Treat changed offers as warnings, unavailable as errors
      if (error.type === 'offer_changed') {
        warnings.push(error);
      } else {
        errors.push(error);
      }
    }
  }

  // Validate products
  for (const productItem of cart.products) {
    const currentProduct = currentProducts.get(productItem.productId);
    const error = validateProductItem(productItem, currentProduct || null);

    if (error) {
      errors.push(error);
    }
  }

  // Check invalid items flag
  if (cart.hasInvalidItems) {
    warnings.push({
      type: 'offer_changed',
      itemId: '',
      itemName: '',
      message: 'Some offers in your cart have been modified. Please review your cart.',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Check if adding an item would exceed quantity limits
 */
export const canAddToCart = (
  itemId: string,
  quantity: number,
  cart: Cart | null,
  maxQuantity: number,
  minQuantity: number = 1
): { canAdd: boolean; reason?: string; currentQuantity: number } => {
  const currentQuantity = cart
    ? (cart.offers.find(o => o.offerId === itemId)?.quantity || 0) +
      (cart.products.find(p => p.productId === itemId)?.quantity || 0)
    : 0;

  const newQuantity = currentQuantity + quantity;

  if (newQuantity < minQuantity) {
    return {
      canAdd: false,
      reason: `Minimum quantity is ${minQuantity}`,
      currentQuantity,
    };
  }

  if (newQuantity > maxQuantity) {
    return {
      canAdd: false,
      reason: `Maximum quantity is ${maxQuantity}. You currently have ${currentQuantity} in cart.`,
      currentQuantity,
    };
  }

  return {
    canAdd: true,
    currentQuantity,
  };
};

/**
 * Format price in dollars (from cents)
 */
export const formatPrice = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`;
};

/**
 * Calculate discount percentage
 */
export const calculateDiscountPercentage = (
  originalPrice: number,
  discountedPrice: number
): number => {
  if (originalPrice === 0) return 0;
  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
};
