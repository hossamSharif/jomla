/**
 * Product Types
 *
 * Stores individual grocery products that can be sold standalone or included in offers.
 */

import { Timestamp } from 'firebase/firestore';

export interface Product {
  id: string;                     // Auto-generated document ID
  name: string;                   // e.g., "Organic Milk 1L"
  description: string;            // Product details
  basePrice: number;              // Regular price in cents (e.g., 299 = $2.99)

  // Images
  imageUrl: string;               // Firebase Storage URL (main image)
  thumbnailUrl?: string;          // Optimized thumbnail (150x150)

  // Quantity Constraints
  minQuantity: number;            // Minimum order quantity (default: 1)
  maxQuantity: number;            // Maximum order quantity (default: 999)

  // Inventory (basic tracking)
  inStock: boolean;               // Simple availability flag

  // Categorization
  category: string;               // e.g., "Dairy", "Produce", "Bakery"
  tags: string[];                 // Searchable tags

  // Status
  status: 'active' | 'inactive';  // Only active products visible to customers

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;              // Admin user ID
}
