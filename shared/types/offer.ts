/**
 * Offer Types
 *
 * Stores bundled product offers with discounted pricing.
 */

import { Timestamp } from 'firebase/firestore';

export interface OfferProduct {
  productId: string;              // Reference to product
  productName: string;            // Denormalized for display
  basePrice: number;              // Original price (cents)
  discountedPrice: number;        // Offer price (cents)
  discountAmount: number;         // Calculated: basePrice - discountedPrice
  discountPercentage: number;     // Calculated: (discountAmount / basePrice) * 100
}

export interface Offer {
  id: string;                     // Auto-generated document ID
  name: string;                   // e.g., "Weekend Breakfast Bundle"
  description: string;            // Offer details

  // Bundled Products
  products: OfferProduct[];       // Array of products with pricing

  // Pricing Summary
  originalTotal: number;          // Sum of all basePrice (cents)
  discountedTotal: number;        // Sum of all discountedPrice (cents)
  totalSavings: number;           // originalTotal - discountedTotal
  savingsPercentage: number;      // (totalSavings / originalTotal) * 100

  // Quantity Constraints
  minQuantity: number;            // Minimum order quantity (default: 1)
  maxQuantity: number;            // Maximum order quantity per order

  // Validity Period
  validFrom?: Timestamp;          // Optional start date
  validUntil?: Timestamp;         // Optional expiry date

  // Display
  imageUrl?: string;              // Optional offer banner image
  thumbnailUrl?: string;

  // Status
  status: 'draft' | 'active' | 'inactive';  // Only active offers visible

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;        // When offer became active
  createdBy: string;              // Admin user ID
}
