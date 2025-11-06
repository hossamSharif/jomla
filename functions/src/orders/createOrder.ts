/**
 * Create Order Cloud Function
 *
 * Creates an order from cart contents with full validation.
 * This function handles:
 * - Cart validation (offers/products still available and unchanged)
 * - Order creation with full item snapshots
 * - Cart clearing after successful order
 * - Order confirmation notification triggering
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { generateOrderNumber } from '../utils/orderNumber';

/**
 * Request interface for createOrder
 */
export interface CreateOrderRequest {
  cartId: string;
  fulfillmentMethod: 'delivery' | 'pickup';
  deliveryDetails?: {
    address: string;
    city: string;
    postalCode: string;
    notes?: string;
  };
  pickupDetails?: {
    pickupTime: number; // Unix timestamp
  };
}

/**
 * Response interface for createOrder
 */
export interface CreateOrderResponse {
  orderId: string;
  orderNumber: string;
  total: number;
  estimatedDelivery?: number;
}

/**
 * Validation result interface
 */
interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    type: string;
    itemId: string;
    message: string;
    maxAllowed?: number;
  }>;
}

/**
 * Create order Cloud Function (callable HTTPS function)
 */
export const createOrder = functions.https.onCall(
  async (
    data: CreateOrderRequest,
    context
  ): Promise<CreateOrderResponse> => {
    const db = admin.firestore();

    // 1. Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be logged in to place an order.');
    }

    const request = data;
    const userId = context.auth.uid;

    // 2. Validate request
    if (!request.cartId || request.cartId !== userId) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid cart ID.');
    }

    if (!request.fulfillmentMethod || !['delivery', 'pickup'].includes(request.fulfillmentMethod)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid fulfillment method.');
    }

    if (request.fulfillmentMethod === 'delivery') {
      if (
        !request.deliveryDetails ||
        !request.deliveryDetails.address ||
        !request.deliveryDetails.city ||
        !request.deliveryDetails.postalCode
      ) {
        throw new functions.https.HttpsError('invalid-argument', 'Delivery details are required for delivery orders.');
      }
    }

    if (request.fulfillmentMethod === 'pickup') {
      if (!request.pickupDetails || !request.pickupDetails.pickupTime) {
        throw new functions.https.HttpsError('invalid-argument', 'Pickup time is required for pickup orders.');
      }

      // Validate pickup time is in the future
      if (request.pickupDetails.pickupTime < Date.now()) {
        throw new functions.https.HttpsError('invalid-argument', 'Pickup time must be in the future.');
      }
    }

    try {
    // 3. Fetch cart
    const cartRef = db.collection('carts').doc(userId);
    const cartDoc = await cartRef.get();

      if (!cartDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Cart not found.');
      }

      const cart = cartDoc.data()!;

      // 4. Validate cart is not empty
      if (
        (!cart.offers || cart.offers.length === 0) &&
        (!cart.products || cart.products.length === 0)
      ) {
        throw new functions.https.HttpsError('failed-precondition', 'Cart is empty.');
      }

      // 5. Validate cart items
      const validation = await validateCartItems(db, cart);
      if (!validation.isValid) {
        const errorMessages = validation.errors.map((e) => e.message).join(', ');
        throw new functions.https.HttpsError('failed-precondition', `Cart validation failed: ${errorMessages}`);
      }

      // 6. Fetch user details
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User not found.');
      }

    const user = userDoc.data()!;

    // 7. Calculate totals
    const subtotal = cart.subtotal || 0;
    const totalSavings = cart.totalSavings || 0;
    const deliveryFee = request.fulfillmentMethod === 'delivery' ? calculateDeliveryFee(subtotal) : 0;
    const tax = calculateTax(subtotal + deliveryFee);
    const total = subtotal + deliveryFee + tax;

    // 8. Generate order number
    const orderNumber = await generateOrderNumber();

    // 9. Prepare order data
    const orderData: any = {
      orderNumber,
      userId,
      customerName: `${user.firstName} ${user.lastName}`,
      customerEmail: user.email,
      customerPhone: user.phoneNumber,
      offers: cart.offers || [],
      products: cart.products || [],
      subtotal,
      totalSavings,
      deliveryFee,
      tax,
      total,
      fulfillmentMethod: request.fulfillmentMethod,
      status: 'pending',
      statusHistory: [
        {
          status: 'pending',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        },
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Add fulfillment details
    if (request.fulfillmentMethod === 'delivery') {
      orderData.deliveryDetails = {
        address: request.deliveryDetails!.address,
        city: request.deliveryDetails!.city,
        postalCode: request.deliveryDetails!.postalCode,
        notes: request.deliveryDetails!.notes || '',
      };
    } else {
      orderData.pickupDetails = {
        pickupTime: admin.firestore.Timestamp.fromMillis(request.pickupDetails!.pickupTime),
        pickupLocation: 'Main Store Location', // TODO: Make this configurable
      };
    }

    // 10. Create order in transaction
    const orderId = await db.runTransaction(async (transaction) => {
      // Create order
      const orderRef = db.collection('orders').doc();
      transaction.set(orderRef, orderData);

      // Clear cart
      transaction.update(cartRef, {
        offers: [],
        products: [],
        subtotal: 0,
        totalSavings: 0,
        total: 0,
        hasInvalidItems: false,
        invalidOfferIds: [],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return orderRef.id;
    });

      // 11. Calculate estimated delivery (if applicable)
      let estimatedDelivery: number | undefined;
      if (request.fulfillmentMethod === 'delivery') {
        // Estimate 2 hours for delivery
        estimatedDelivery = Date.now() + 2 * 60 * 60 * 1000;
      }

      // 12. Return response
      return {
        orderId,
        orderNumber,
        total,
        estimatedDelivery,
      };
    } catch (error: any) {
      console.error('Error creating order:', error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', 'Failed to create order. Please try again.');
    }
  }
);

/**
 * Validate cart items are still available and unchanged
 */
async function validateCartItems(
  db: admin.firestore.Firestore,
  cart: any
): Promise<ValidationResult> {
  const errors: Array<{
    type: string;
    itemId: string;
    message: string;
    maxAllowed?: number;
  }> = [];

  // Validate offers
  if (cart.offers && cart.offers.length > 0) {
    for (const cartOffer of cart.offers) {
      const offerRef = db.collection('offers').doc(cartOffer.offerId);
      const offerDoc = await offerRef.get();

      if (!offerDoc.exists) {
        errors.push({
          type: 'offer_unavailable',
          itemId: cartOffer.offerId,
          message: `Offer "${cartOffer.offerName}" is no longer available.`,
        });
        continue;
      }

      const offer = offerDoc.data()!;

      // Check if offer is active
      if (offer.status !== 'active') {
        errors.push({
          type: 'offer_unavailable',
          itemId: cartOffer.offerId,
          message: `Offer "${cartOffer.offerName}" is no longer active.`,
        });
        continue;
      }

      // Check if offer has changed
      if (offer.discountedTotal !== cartOffer.discountedTotal / cartOffer.quantity) {
        errors.push({
          type: 'offer_changed',
          itemId: cartOffer.offerId,
          message: `Offer "${cartOffer.offerName}" price has changed.`,
        });
        continue;
      }

      // Check quantity limits
      if (cartOffer.quantity < offer.minQuantity || cartOffer.quantity > offer.maxQuantity) {
        errors.push({
          type: 'quantity_exceeded',
          itemId: cartOffer.offerId,
          message: `Offer "${cartOffer.offerName}" quantity is outside allowed range.`,
          maxAllowed: offer.maxQuantity,
        });
      }
    }
  }

  // Validate products
  if (cart.products && cart.products.length > 0) {
    for (const cartProduct of cart.products) {
      const productRef = db.collection('products').doc(cartProduct.productId);
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
        errors.push({
          type: 'product_unavailable',
          itemId: cartProduct.productId,
          message: `Product "${cartProduct.productName}" is no longer available.`,
        });
        continue;
      }

      const product = productDoc.data()!;

      // Check if product is active and in stock
      if (product.status !== 'active' || !product.inStock) {
        errors.push({
          type: 'product_unavailable',
          itemId: cartProduct.productId,
          message: `Product "${cartProduct.productName}" is out of stock.`,
        });
        continue;
      }

      // Check quantity limits
      if (
        cartProduct.quantity < product.minQuantity ||
        cartProduct.quantity > product.maxQuantity
      ) {
        errors.push({
          type: 'quantity_exceeded',
          itemId: cartProduct.productId,
          message: `Product "${cartProduct.productName}" quantity is outside allowed range.`,
          maxAllowed: product.maxQuantity,
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate delivery fee based on subtotal
 */
function calculateDeliveryFee(subtotal: number): number {
  // Free delivery for orders over $50
  if (subtotal >= 5000) {
    return 0;
  }

  // Standard delivery fee: $5.99
  return 599;
}

/**
 * Calculate tax (10% in this example)
 */
function calculateTax(amount: number): number {
  return Math.round(amount * 0.1);
}
