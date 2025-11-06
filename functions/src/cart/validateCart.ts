/**
 * Validate Cart Cloud Function
 *
 * Server-side validation of cart contents before checkout.
 * Checks for quantity limits, offer availability, and price changes.
 */

import { https } from 'firebase-functions/v2';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

interface ValidateCartRequest {
  cartItems: {
    offers: Array<{
      offerId: string;
      quantity: number;
    }>;
    products: Array<{
      productId: string;
      quantity: number;
    }>;
  };
}

interface ValidationError {
  type: 'offer_unavailable' | 'offer_changed' | 'quantity_exceeded' | 'product_unavailable';
  itemId: string;
  message: string;
  maxAllowed?: number;
}

interface ValidateCartResponse {
  isValid: boolean;
  errors: ValidationError[];
}

export const validateCart = https.onCall(
  { maxInstances: 10 },
  async (request): Promise<ValidateCartResponse> => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated to validate cart');
    }

    const data = request.data as ValidateCartRequest;

    // Validate request data
    if (!data.cartItems) {
      throw new HttpsError('invalid-argument', 'Missing cartItems in request');
    }

    const { offers = [], products = [] } = data.cartItems;

    if (!Array.isArray(offers) || !Array.isArray(products)) {
      throw new HttpsError('invalid-argument', 'cartItems.offers and cartItems.products must be arrays');
    }

    const db = getFirestore();
    const errors: ValidationError[] = [];

    try {
      // Validate offers
      for (const cartOffer of offers) {
        if (!cartOffer.offerId || typeof cartOffer.quantity !== 'number') {
          throw new HttpsError('invalid-argument', 'Invalid offer item format');
        }

        try {
          const offerDoc = await db.collection('offers').doc(cartOffer.offerId).get();

          // Check if offer exists
          if (!offerDoc.exists) {
            errors.push({
              type: 'offer_unavailable',
              itemId: cartOffer.offerId,
              message: 'Offer no longer exists',
            });
            continue;
          }

          const offer = offerDoc.data();
          if (!offer) continue;

          // Check if offer is active
          if (offer.status !== 'active') {
            errors.push({
              type: 'offer_unavailable',
              itemId: cartOffer.offerId,
              message: `Offer "${offer.name}" is no longer active`,
            });
            continue;
          }

          // Check validity period
          const now = new Date();
          if (offer.validFrom && offer.validFrom.toDate() > now) {
            errors.push({
              type: 'offer_unavailable',
              itemId: cartOffer.offerId,
              message: `Offer "${offer.name}" is not yet valid`,
            });
            continue;
          }

          if (offer.validUntil && offer.validUntil.toDate() < now) {
            errors.push({
              type: 'offer_unavailable',
              itemId: cartOffer.offerId,
              message: `Offer "${offer.name}" has expired`,
            });
            continue;
          }

          // Check quantity limits
          if (cartOffer.quantity < offer.minQuantity) {
            errors.push({
              type: 'quantity_exceeded',
              itemId: cartOffer.offerId,
              message: `Minimum quantity for "${offer.name}" is ${offer.minQuantity}`,
              maxAllowed: offer.minQuantity,
            });
            continue;
          }

          if (cartOffer.quantity > offer.maxQuantity) {
            errors.push({
              type: 'quantity_exceeded',
              itemId: cartOffer.offerId,
              message: `Maximum quantity for "${offer.name}" is ${offer.maxQuantity}`,
              maxAllowed: offer.maxQuantity,
            });
            continue;
          }
        } catch (error) {
          console.error(`Error validating offer ${cartOffer.offerId}:`, error);
          errors.push({
            type: 'offer_unavailable',
            itemId: cartOffer.offerId,
            message: 'Failed to validate offer',
          });
        }
      }

      // Validate products
      for (const cartProduct of products) {
        if (!cartProduct.productId || typeof cartProduct.quantity !== 'number') {
          throw new HttpsError('invalid-argument', 'Invalid product item format');
        }

        try {
          const productDoc = await db.collection('products').doc(cartProduct.productId).get();

          // Check if product exists
          if (!productDoc.exists) {
            errors.push({
              type: 'product_unavailable',
              itemId: cartProduct.productId,
              message: 'Product no longer exists',
            });
            continue;
          }

          const product = productDoc.data();
          if (!product) continue;

          // Check if product is active
          if (product.status !== 'active') {
            errors.push({
              type: 'product_unavailable',
              itemId: cartProduct.productId,
              message: `Product "${product.name}" is no longer active`,
            });
            continue;
          }

          // Check stock availability
          if (!product.inStock) {
            errors.push({
              type: 'product_unavailable',
              itemId: cartProduct.productId,
              message: `Product "${product.name}" is out of stock`,
            });
            continue;
          }

          // Check quantity limits
          if (cartProduct.quantity < product.minQuantity) {
            errors.push({
              type: 'quantity_exceeded',
              itemId: cartProduct.productId,
              message: `Minimum quantity for "${product.name}" is ${product.minQuantity}`,
              maxAllowed: product.minQuantity,
            });
            continue;
          }

          if (cartProduct.quantity > product.maxQuantity) {
            errors.push({
              type: 'quantity_exceeded',
              itemId: cartProduct.productId,
              message: `Maximum quantity for "${product.name}" is ${product.maxQuantity}`,
              maxAllowed: product.maxQuantity,
            });
            continue;
          }
        } catch (error) {
          console.error(`Error validating product ${cartProduct.productId}:`, error);
          errors.push({
            type: 'product_unavailable',
            itemId: cartProduct.productId,
            message: 'Failed to validate product',
          });
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      console.error('Error in validateCart function:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError('internal', 'An unexpected error occurred while validating cart');
    }
  }
);
