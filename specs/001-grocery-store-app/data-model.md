# Data Model

**Feature**: Grocery Store Mobile App with Admin Dashboard
**Date**: 2025-11-05
**Phase**: 1 - Design

## Overview

This document defines the Firestore database schema for the grocery store application. Firestore is a NoSQL document database, so the model uses collections and documents with denormalization where appropriate for read performance.

## Collections & Document Structure

### Users Collection (`users`)

Stores customer account information and authentication metadata.

**Collection Path**: `/users/{userId}`

**Document Schema**:
```typescript
interface User {
  uid: string;                    // Firebase Auth UID (same as document ID)
  email: string;                  // Unique, used for login
  phoneNumber: string;            // E.164 format: +1234567890
  firstName: string;
  lastName: string;

  // Verification & Authentication
  isPhoneVerified: boolean;       // Account only active when true
  verificationCodeHash?: string;  // Hashed verification code (for password reset)
  verificationCodeExpiry?: Timestamp;  // Expires after 30 minutes
  verificationAttempts: number;   // Rate limiting: max 3 per hour
  lastVerificationRequest?: Timestamp;  // For rate limiting window

  // Session Management
  lastLoginAt?: Timestamp;
  sessionExpiresAt?: Timestamp;   // 30 days from last activity

  // Notifications
  fcmTokens: string[];            // Array of device tokens for push notifications

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- `email` (unique, enforced by Firebase Auth)
- `phoneNumber` (unique, enforced by application logic)

**Security Rules**:
```javascript
match /users/{userId} {
  // Users can read their own profile
  allow read: if request.auth.uid == userId;

  // Users can update their own profile (limited fields)
  allow update: if request.auth.uid == userId
    && request.resource.data.keys().hasOnly([
      'firstName', 'lastName', 'fcmTokens', 'lastLoginAt', 'sessionExpiresAt', 'updatedAt'
    ]);
}
```

---

### Products Collection (`products`)

Stores individual grocery products that can be sold standalone or included in offers.

**Collection Path**: `/products/{productId}`

**Document Schema**:
```typescript
interface Product {
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
```

**Indexes**:
- Composite: `status` ASC, `category` ASC, `createdAt` DESC
- Single: `status` ASC

**Security Rules**:
```javascript
match /products/{productId} {
  // Any authenticated user can read active products
  allow read: if request.auth != null && resource.data.status == 'active';

  // Only admins can write
  allow create, update, delete: if request.auth.token.admin == true;
}
```

---

### Offers Collection (`offers`)

Stores bundled product offers with discounted pricing.

**Collection Path**: `/offers/{offerId}`

**Document Schema**:
```typescript
interface OfferProduct {
  productId: string;              // Reference to product
  productName: string;            // Denormalized for display
  basePrice: number;              // Original price (cents)
  discountedPrice: number;        // Offer price (cents)
  discountAmount: number;         // Calculated: basePrice - discountedPrice
  discountPercentage: number;     // Calculated: (discountAmount / basePrice) * 100
}

interface Offer {
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
```

**Indexes**:
- Composite: `status` ASC, `publishedAt` DESC
- Composite: `status` ASC, `validUntil` ASC (for expiry cleanup)

**Security Rules**:
```javascript
match /offers/{offerId} {
  // Any authenticated user can read active offers
  allow read: if request.auth != null
    && resource.data.status == 'active'
    && (resource.data.validFrom == null || resource.data.validFrom <= request.time)
    && (resource.data.validUntil == null || resource.data.validUntil >= request.time);

  // Only admins can write
  allow create, update, delete: if request.auth.token.admin == true;
}
```

**Design Decision**: Products are denormalized within offers to avoid extra reads when displaying offer details. Trade-off: If product name changes, old offers retain original name (acceptable for historical accuracy).

---

### Carts Collection (`carts`)

Stores user shopping carts with mixed content (offers + individual products).

**Collection Path**: `/carts/{userId}` (one cart per user)

**Document Schema**:
```typescript
interface CartOfferItem {
  offerId: string;
  offerName: string;              // Denormalized
  quantity: number;               // How many times this offer is added
  discountedTotal: number;        // Offer price × quantity
  originalTotal: number;          // Original price × quantity
  products: OfferProduct[];       // Snapshot of offer products at time of add
  version: number;                // Offer version for detecting changes
}

interface CartProductItem {
  productId: string;
  productName: string;            // Denormalized
  quantity: number;
  pricePerUnit: number;           // Price when added (cents)
  totalPrice: number;             // pricePerUnit × quantity
  imageUrl?: string;              // Denormalized for quick display
}

interface Cart {
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
```

**Indexes**: None needed (always queried by document ID)

**Security Rules**:
```javascript
match /carts/{userId} {
  // Users can only access their own cart
  allow read, write: if request.auth.uid == userId;
}
```

**Validation Logic**:
- When user opens cart, client checks `hasInvalidItems` flag
- Cloud Function sets this flag when admin modifies/deletes an offer
- Client displays warning and requires user to remove invalid items

---

### Orders Collection (`orders`)

Stores customer orders with full item details and fulfillment information.

**Collection Path**: `/orders/{orderId}`

**Document Schema**:
```typescript
interface OrderOfferItem {
  offerId: string;
  offerName: string;
  quantity: number;
  discountedTotal: number;
  originalTotal: number;
  products: OfferProduct[];       // Full product breakdown for invoice
}

interface OrderProductItem {
  productId: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
}

type FulfillmentMethod = 'delivery' | 'pickup';
type OrderStatus =
  | 'pending'           // Order placed, awaiting confirmation
  | 'confirmed'         // Admin confirmed order
  | 'preparing'         // Order being prepared
  | 'out_for_delivery'  // (Delivery only) On the way
  | 'ready_for_pickup'  // (Pickup only) Ready to collect
  | 'completed'         // Delivered or picked up
  | 'cancelled';        // Cancelled by user or admin

interface DeliveryDetails {
  address: string;
  city: string;
  postalCode: string;
  notes?: string;                 // Delivery instructions
}

interface PickupDetails {
  pickupTime: Timestamp;          // Requested pickup time
  pickupLocation: string;         // Pickup address (configured by admin)
}

interface Order {
  id: string;                     // Auto-generated document ID
  orderNumber: string;            // Human-readable: ORD-20251105-0001

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
  statusHistory: Array<{
    status: OrderStatus;
    timestamp: Timestamp;
    updatedBy?: string;           // Admin user ID
  }>;

  // Invoice
  invoiceUrl?: string;            // Firebase Storage URL (generated PDF)

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}
```

**Indexes**:
- Composite: `userId` ASC, `createdAt` DESC (user order history)
- Composite: `status` ASC, `createdAt` DESC (admin order queue)
- Single: `createdAt` DESC (recent orders)

**Security Rules**:
```javascript
match /orders/{orderId} {
  // Users can read their own orders
  allow read: if request.auth.uid == resource.data.userId;

  // Users can create orders (validated by Cloud Function)
  allow create: if request.auth.uid == request.resource.data.userId;

  // Only admins can update orders
  allow update: if request.auth.token.admin == true;
}
```

---

### Admin Users Collection (`adminUsers`)

Stores admin user accounts with role-based permissions.

**Collection Path**: `/adminUsers/{adminId}`

**Document Schema**:
```typescript
interface AdminUser {
  uid: string;                    // Firebase Auth UID
  email: string;
  firstName: string;
  lastName: string;

  // Permissions
  role: 'super_admin' | 'admin' | 'viewer';
  permissions: {
    manageProducts: boolean;
    manageOffers: boolean;
    manageOrders: boolean;
    manageAdmins: boolean;        // Super admin only
  };

  // Status
  isActive: boolean;

  // Metadata
  createdAt: Timestamp;
  lastLoginAt?: Timestamp;
}
```

**Security Rules**:
```javascript
match /adminUsers/{adminId} {
  // Only authenticated admins can read
  allow read: if request.auth.token.admin == true;

  // Only super admins can create/update admins
  allow write: if request.auth.token.admin == true
    && get(/databases/$(database)/documents/adminUsers/$(request.auth.uid)).data.role == 'super_admin';
}
```

---

### Notifications Collection (`notifications`)

Stores notification history and delivery status.

**Collection Path**: `/notifications/{notificationId}`

**Document Schema**:
```typescript
type NotificationType = 'new_offer' | 'order_status' | 'general';

interface Notification {
  id: string;
  type: NotificationType;

  // Content
  title: string;
  body: string;
  data?: Record<string, any>;     // Custom payload (offerId, orderId, etc.)

  // Targeting
  targetType: 'all' | 'user' | 'topic';
  targetUserId?: string;          // For user-specific notifications
  targetTopic?: string;           // For topic-based (e.g., 'all-users')

  // Delivery
  sentAt: Timestamp;
  deliveryStatus: 'pending' | 'sent' | 'failed';
  fcmMessageId?: string;

  // Reference
  relatedOfferId?: string;
  relatedOrderId?: string;

  // Metadata
  createdBy?: string;             // Admin user ID (for manual notifications)
}
```

**Indexes**:
- Composite: `targetUserId` ASC, `sentAt` DESC
- Composite: `type` ASC, `sentAt` DESC

---

## Relationships

### User → Cart (1:1)
- Each user has exactly one cart (document ID = userId)
- Cart is deleted when order is placed and recreated on next add

### User → Orders (1:Many)
- User can have multiple orders
- Query: `orders` where `userId == currentUser.uid` order by `createdAt DESC`

### Product ↔ Offer (Many:Many)
- Products are denormalized within offers
- No direct references; offers contain product snapshots

### Cart → Products/Offers (snapshot)
- Cart stores snapshots of products/offers at time of add
- If offer changes, `hasInvalidItems` flag is set by Cloud Function

### Order → Products/Offers (snapshot)
- Orders store complete snapshots for historical accuracy
- Invoice shows prices at time of purchase, not current prices

## Data Validation Rules

### Price Validation
- All prices stored in **cents** (integer) to avoid floating-point errors
- Example: $2.99 = 299 cents

### Quantity Validation
- Enforced in Cloud Functions before order creation
- Client-side validation provides immediate feedback

### Status Transitions
- Orders: `pending → confirmed → preparing → (out_for_delivery|ready_for_pickup) → completed`
- Status can transition to `cancelled` from any state except `completed`

### Denormalization Strategy
- **When to denormalize**: Data unlikely to change or historical accuracy needed (prices, product names in orders)
- **When to reference**: Frequently changing data or large documents (avoid denormalizing full product catalogs)

## Migration & Versioning

### Schema Changes
- Firestore is schemaless; new fields can be added without migration
- Optional fields use `?` in TypeScript interfaces
- Cloud Functions handle missing fields gracefully with default values

### Data Migrations
- Use Cloud Functions with batch writes for bulk updates
- Example: Adding `version` field to existing offers

## Performance Considerations

### Read Optimization
- Denormalize frequently accessed data (product names in cart/orders)
- Use composite indexes for common query patterns
- Limit query results with pagination (`.limit(20)`)

### Write Optimization
- Batch writes for multi-document updates (cart invalidation)
- Use transactions for critical operations (order creation)

### Offline Support
- Enable offline persistence: `enableIndexedDbPersistence()`
- Cache frequently accessed collections (products, offers)
- Sync carts to AsyncStorage for offline cart management

## Security Considerations

### Data Access
- Users can only read/write their own carts and read their own orders
- All users can read active products/offers
- Only admins can write products/offers/order status

### Sensitive Data
- Passwords managed by Firebase Auth (never stored in Firestore)
- Verification codes stored as hashed values
- Payment details handled by payment gateway (not stored in Firestore)

### Rate Limiting
- SMS verification: Max 3 attempts per hour (enforced in `users.verificationAttempts`)
- Cloud Functions have built-in rate limiting via Firebase

## Next Steps

See `contracts/` directory for Cloud Function API contracts and `quickstart.md` for development setup instructions.
