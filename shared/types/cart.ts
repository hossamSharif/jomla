/**
 * Cart Types
 *
 * Stores user shopping carts with mixed content (offers + individual products).
 */

import { Timestamp } from 'firebase/firestore';
import { OfferProduct } from './offer';

export interface CartOfferItem {
  offerId: string;
  offerName: string;              // Denormalized
  quantity: number;               // How many times this offer is added
  discountedTotal: number;        // Offer price × quantity
  originalTotal: number;          // Original price × quantity
  products: OfferProduct[];       // Snapshot of offer products at time of add
  version: number;                // Offer version for detecting changes
}

export interface CartProductItem {
  productId: string;
  productName: string;            // Denormalized
  quantity: number;
  pricePerUnit: number;           // Price when added (cents)
  totalPrice: number;             // pricePerUnit × quantity
  imageUrl?: string;              // Denormalized for quick display
}

export interface Cart {
  userId: string;                 // Same as document ID

  // Cart Items
  offers: CartOfferItem[];        // Array of offer items
  products: CartProductItem[];    // Array of individual product items

  // Totals
  subtotal: number;               // Sum of all item totals (cents)
  totalSavings: number;           // Sum of savings from offers
  total: number;                  // Final cart total

  // Validation Flags
  hasInvalidItems: boolean;       // True if any offer changed/deleted
  invalidOfferIds: string[];      // List of offers that changed

  // Metadata
  updatedAt: Timestamp;           // Last modified
}
