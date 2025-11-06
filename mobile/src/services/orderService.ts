/**
 * Order Firestore Service
 *
 * Handles order CRUD operations and order submission logic.
 * Provides methods for creating orders, fetching order history, and retrieving order details.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  addDoc,
  updateDoc,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from './firebase';
import {
  Order,
  OrderOfferItem,
  OrderProductItem,
  FulfillmentMethod,
  DeliveryDetails,
  PickupDetails,
} from '../../../shared/types/order';
import { Cart } from '../../../shared/types/cart';

/**
 * Fetch user's order history
 * Orders are sorted by creation date (newest first)
 */
export const fetchUserOrders = async (userId: string, maxResults: number = 20): Promise<Order[]> => {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Order[];
  } catch (error) {
    console.error('Error fetching user orders:', error);
    throw new Error('Failed to fetch orders');
  }
};

/**
 * Fetch a single order by ID
 */
export const fetchOrderById = async (orderId: string): Promise<Order | null> => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      return null;
    }

    return {
      id: orderDoc.id,
      ...orderDoc.data(),
    } as Order;
  } catch (error) {
    console.error('Error fetching order:', error);
    throw new Error('Failed to fetch order details');
  }
};

/**
 * Create Order Request (sent to Cloud Function)
 */
export interface CreateOrderRequest {
  cartId: string;
  fulfillmentMethod: FulfillmentMethod;
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
 * Create Order Response (from Cloud Function)
 */
export interface CreateOrderResponse {
  orderId: string;
  orderNumber: string;
  total: number;
  estimatedDelivery?: number; // Unix timestamp
}

/**
 * Submit order via Cloud Function
 * This function validates the cart and creates the order
 */
export const submitOrder = async (
  request: CreateOrderRequest
): Promise<CreateOrderResponse> => {
  try {
    const functions = getFunctions();
    const createOrderFn = httpsCallable<CreateOrderRequest, CreateOrderResponse>(
      functions,
      'createOrder'
    );

    const result = await createOrderFn(request);
    return result.data;
  } catch (error: any) {
    console.error('Error submitting order:', error);

    // Parse Firebase Functions errors
    if (error.code) {
      switch (error.code) {
        case 'failed-precondition':
          throw new Error('Cart validation failed. Some items may have changed or are no longer available.');
        case 'invalid-argument':
          throw new Error('Invalid order details. Please check your delivery or pickup information.');
        case 'resource-exhausted':
          throw new Error('Selected pickup time is no longer available. Please choose another time.');
        case 'unauthenticated':
          throw new Error('You must be logged in to place an order.');
        default:
          throw new Error(error.message || 'Failed to place order. Please try again.');
      }
    }

    throw new Error('Failed to place order. Please try again.');
  }
};

/**
 * Clear user's cart after successful order
 * This is called after submitOrder succeeds
 */
export const clearCartAfterOrder = async (userId: string): Promise<void> => {
  try {
    const cartRef = doc(db, 'carts', userId);
    await updateDoc(cartRef, {
      offers: [],
      products: [],
      subtotal: 0,
      totalSavings: 0,
      total: 0,
      hasInvalidItems: false,
      invalidOfferIds: [],
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    // Don't throw error - cart clearing failure shouldn't block order success
  }
};

/**
 * Calculate delivery fee based on order details
 * This is a simple implementation - you can make it more complex based on distance, zone, etc.
 */
export const calculateDeliveryFee = (
  fulfillmentMethod: FulfillmentMethod,
  subtotal: number
): number => {
  if (fulfillmentMethod === 'pickup') {
    return 0;
  }

  // Simple delivery fee calculation
  // Free delivery for orders over $50
  if (subtotal >= 5000) {
    return 0;
  }

  // Standard delivery fee: $5.99
  return 599;
};

/**
 * Format order status for display
 */
export const formatOrderStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    out_for_delivery: 'Out for Delivery',
    ready_for_pickup: 'Ready for Pickup',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  return statusMap[status] || status;
};

/**
 * Get status color for UI display
 */
export const getOrderStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    pending: '#FFA500', // Orange
    confirmed: '#4CAF50', // Green
    preparing: '#2196F3', // Blue
    out_for_delivery: '#9C27B0', // Purple
    ready_for_pickup: '#4CAF50', // Green
    completed: '#4CAF50', // Green
    cancelled: '#F44336', // Red
  };

  return colorMap[status] || '#757575'; // Grey default
};
