/**
 * Order Types
 *
 * Stores customer orders with full item details and fulfillment information.
 */

import { Timestamp } from 'firebase/firestore';
import { OfferProduct } from './offer';

export interface OrderOfferItem {
  offerId: string;
  offerName: string;
  quantity: number;
  discountedTotal: number;
  originalTotal: number;
  products: OfferProduct[];       // Full product breakdown for invoice
}

export interface OrderProductItem {
  productId: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
}

export type FulfillmentMethod = 'delivery' | 'pickup';

export type OrderStatus =
  | 'pending'           // Order placed, awaiting confirmation
  | 'confirmed'         // Admin confirmed order
  | 'preparing'         // Order being prepared
  | 'out_for_delivery'  // (Delivery only) On the way
  | 'ready_for_pickup'  // (Pickup only) Ready to collect
  | 'completed'         // Delivered or picked up
  | 'cancelled';        // Cancelled by user or admin

export interface DeliveryDetails {
  address: string;
  city: string;
  postalCode: string;
  notes?: string;                 // Delivery instructions
}

export interface PickupDetails {
  pickupTime: Timestamp;          // Requested pickup time
  pickupLocation: string;         // Pickup address (configured by admin)
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: Timestamp;
  updatedBy?: string;             // Admin user ID
}

export interface Order {
  id: string;                     // Auto-generated document ID
  orderNumber: string;            // Human-readable: ORD-YYYYMMDD-####

  // Customer
  userId: string;
  customerName: string;           // Denormalized: firstName + lastName
  customerEmail: string;          // For notifications
  customerPhone: string;          // For delivery contact

  // Order Items
  offers: OrderOfferItem[];
  products: OrderProductItem[];

  // Pricing
  subtotal: number;               // Sum of all items
  totalSavings: number;           // Total discount from offers
  deliveryFee: number;            // 0 for pickup
  tax: number;                    // Calculated tax
  total: number;                  // Final total

  // Fulfillment
  fulfillmentMethod: FulfillmentMethod;
  deliveryDetails?: DeliveryDetails;
  pickupDetails?: PickupDetails;

  // Status Tracking
  status: OrderStatus;
  statusHistory: StatusHistoryEntry[];

  // Invoice
  invoiceUrl?: string;            // Firebase Storage URL (generated PDF)

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}
