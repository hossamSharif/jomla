# Data Model Extensions

**Feature**: 002-payment-offers-landing
**Date**: 2025-11-05
**Phase**: 1 - Design
**Base Model**: [001-grocery-store-app/data-model.md](../001-grocery-store-app/data-model.md)

## Overview

This document defines **extensions** to the Firestore database schema established in feature 001. This feature adds two major capabilities:
1. **Alternative Payment Methods**: Cash on Delivery (COD) and offline payment with transaction proof uploads
2. **Featured Offers Landing Page**: Full-screen promotional content carousel with video/image support

**Design Philosophy**: Additive architecture - existing collections are extended with new fields, and new collections are added. No breaking changes to feature 001's schema.

## Extensions to Existing Collections

### Orders Collection (`orders`) - EXTENDED

Feature 001 established the Orders collection. This feature adds payment-related fields.

**Collection Path**: `/orders/{orderId}` (same as feature 001)

**NEW FIELDS** (added to existing Order interface):
```typescript
interface Order {
  // ... all existing fields from feature 001

  // NEW: Payment Method Tracking
  paymentMethod: 'cod' | 'offline' | 'online';  // Payment type
  paymentStatus: 'pending' | 'verified' | 'collected' | 'failed';

  // NEW: COD-Specific Fields
  codCollectedAmount?: number;        // Actual amount collected in cents (may differ from total)
  codCollectedAt?: Timestamp;         // When payment was collected by driver
  codCollectedBy?: string;            // Driver/admin UID who collected payment
  codNotes?: string;                  // Notes about collection (e.g., "Customer had exact change")

  // NEW: Offline Payment Reference
  offlinePaymentProofId?: string;     // Reference to offlinePaymentProofs collection
}
```

**NEW Indexes** (add to firestore.indexes.json):
```json
{
  "collectionGroup": "orders",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "paymentMethod", "order": "ASCENDING" },
    { "fieldPath": "paymentStatus", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "orders",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "paymentStatus", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Updated Security Rules**:
```javascript
match /orders/{orderId} {
  // Users can read their own orders (unchanged from feature 001)
  allow read: if request.auth.uid == resource.data.userId;

  // Users can create orders (validated by Cloud Function) - unchanged
  allow create: if request.auth.uid == request.resource.data.userId;

  // NEW: Users can update ONLY paymentStatus for resubmission flow
  allow update: if request.auth.uid == resource.data.userId
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['paymentStatus', 'updatedAt']);

  // Admins can update all fields (unchanged from feature 001)
  allow update: if request.auth.token.admin == true;
}
```

**Migration Notes**:
- Existing orders from feature 001 without paymentMethod will default to 'online' (assumed prepaid)
- Existing orders without paymentStatus will default to 'verified' (already paid)
- Migration script not required since Firestore is schemaless and new fields are optional

---

## New Collections

### Featured Offers Collection (`featuredOffers`)

Stores promotional content displayed in the landing page carousel.

**Collection Path**: `/featuredOffers/{offerId}`

**Document Schema**:
```typescript
interface FeaturedOffer {
  id: string;                     // Auto-generated document ID
  title: string;                  // Offer title (e.g., "Weekend Special Bundle")
  description: string;            // Brief description for accessibility

  // Media (exactly one required)
  mediaType: 'image' | 'video';
  mediaUrl: string;               // Firebase Storage URL
  thumbnailUrl?: string;          // Thumbnail for admin preview
  videoDuration?: number;         // Duration in seconds (for videos only)

  // Linked Content
  linkedOfferId?: string;         // Reference to offers collection (feature 001)
  linkedProductIds?: string[];    // Alternative: direct product links

  // Display Configuration
  displayOrder: number;           // Sort order in carousel (1, 2, 3...)
  backgroundColor?: string;       // Hex color for loading state
  ctaText: string;                // Call-to-action button text (default: "Add to Cart")
  ctaAction: 'add_to_cart' | 'view_details' | 'external_link';

  // Status & Scheduling
  status: 'draft' | 'active' | 'inactive';
  publishedAt?: Timestamp;        // When it became active
  expiresAt?: Timestamp;          // Optional expiration time
  viewCount: number;              // Analytics: how many times viewed
  addToCartCount: number;         // Analytics: conversion tracking

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;              // Admin user ID
}
```

**Indexes**:
```json
{
  "collectionGroup": "featuredOffers",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "displayOrder", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "featuredOffers",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "expiresAt", "order": "ASCENDING" }
  ]
}
```

**Security Rules**:
```javascript
match /featuredOffers/{offerId} {
  // Any authenticated user can read active, non-expired offers
  allow read: if request.auth != null
    && resource.data.status == 'active'
    && (resource.data.expiresAt == null || resource.data.expiresAt > request.time);

  // Admins can read all offers (including drafts)
  allow read: if request.auth.token.admin == true;

  // Only admins can write
  allow create, update, delete: if request.auth.token.admin == true;
}
```

**Design Decision**: Featured offers are separate from regular offers (feature 001) to allow flexibility. A featured offer can link to an existing offer OR directly to products, enabling promotional content that may not match existing catalog structure.

---

### Offline Payment Proofs Collection (`offlinePaymentProofs`)

Stores transaction verification data for offline payment submissions.

**Collection Path**: `/offlinePaymentProofs/{proofId}`

**Document Schema**:
```typescript
interface OfflinePaymentProof {
  id: string;                     // Auto-generated document ID
  orderId: string;                // Reference to orders collection
  userId: string;                 // Customer who uploaded proof

  // Transaction Details
  transactionId: string;          // User-provided transaction ID
  transactionImageUrl: string;    // Firebase Storage URL to proof image
  expectedAmount: number;         // Expected payment amount in cents
  uploadedAmount?: number;        // Amount claimed by user (optional field)

  // Verification Workflow
  status: 'pending' | 'approved' | 'rejected' | 'resubmitted';
  submittedAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;            // Admin UID who reviewed
  rejectionReason?: string;       // Reason for rejection (if status = rejected)
  adminNotes?: string;            // Internal admin notes

  // Validation Metadata
  imageValidated: boolean;        // Cloud Function validated image format
  imageSizeBytes: number;         // Original file size
  imageFormat: string;            // Actual format (jpeg, png)

  // Audit Trail
  submissionAttempts: number;     // Number of times user resubmitted
  statusHistory: Array<{
    status: 'pending' | 'approved' | 'rejected' | 'resubmitted';
    timestamp: Timestamp;
    updatedBy?: string;           // Admin UID
  }>;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
```json
{
  "collectionGroup": "offlinePaymentProofs",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "submittedAt", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "offlinePaymentProofs",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "submittedAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "offlinePaymentProofs",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "orderId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

**Security Rules**:
```javascript
match /offlinePaymentProofs/{proofId} {
  // Users can read their own payment proofs
  allow read: if request.auth.uid == resource.data.userId;

  // Users can create payment proofs for their own orders
  allow create: if request.auth.uid == request.resource.data.userId
    && request.resource.data.status == 'pending'
    && request.resource.data.submittedAt == request.time;

  // Users can update ONLY to resubmit (change status to 'resubmitted' with new image)
  allow update: if request.auth.uid == resource.data.userId
    && request.resource.data.status == 'resubmitted'
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
      'status', 'transactionImageUrl', 'transactionId', 'updatedAt', 'submissionAttempts'
    ]);

  // Admins can read all payment proofs
  allow read: if request.auth.token.admin == true;

  // Admins can update status (approve/reject) and add notes
  allow update: if request.auth.token.admin == true
    && request.resource.data.diff(resource.data).affectedKeys().hasAny([
      'status', 'reviewedAt', 'reviewedBy', 'rejectionReason', 'adminNotes', 'statusHistory', 'updatedAt'
    ]);

  // No one can delete (immutable audit trail)
  allow delete: if false;
}
```

**Design Decision**: Payment proofs are immutable (no deletes) to maintain an audit trail for compliance. Users can only create and resubmit; admins can only update verification fields. This prevents tampering with payment records.

---

## Relationships

### Order → Offline Payment Proof (1:0..1)
- An order MAY have one offline payment proof
- Query: `offlinePaymentProofs` where `orderId == order.id`
- Denormalized reference: Order stores `offlinePaymentProofId` for quick lookup

### Order → Payment Method (1:1)
- Every order MUST have a payment method (cod, offline, online)
- Payment status tracks the payment lifecycle
- COD orders: paymentStatus progresses from 'pending' → 'collected'
- Offline orders: paymentStatus progresses from 'pending' → 'verified' (upon admin approval)

### Featured Offer → Offer/Product (1:0..n)
- A featured offer MAY link to existing offer(s) or product(s)
- Linkage is flexible: `linkedOfferId` XOR `linkedProductIds[]`
- Query: If `linkedOfferId` exists, fetch from offers collection (feature 001)

### User → Offline Payment Proofs (1:Many)
- A user can have multiple payment proofs (one per order with offline payment)
- Query: `offlinePaymentProofs` where `userId == currentUser.uid` order by `submittedAt DESC`

---

## Data Validation Rules

### Payment Method Validation
- Every new order MUST specify `paymentMethod`
- If `paymentMethod == 'cod'`, `paymentStatus` starts as 'pending'
- If `paymentMethod == 'offline'`, order MUST have `offlinePaymentProofId`
- Enforced in Cloud Function `createOrder.ts` (feature 001, now extended)

### Featured Offer Validation
- Exactly one media type: image OR video (not both, not neither)
- If `mediaType == 'video'`, `videoDuration` must be provided
- `displayOrder` must be unique among active offers
- `ctaAction == 'add_to_cart'` requires `linkedOfferId` or `linkedProductIds`

### Payment Proof Validation
- Transaction image MUST exist in Firebase Storage before creating document
- Image MUST pass server-side validation (format, size) via Cloud Function
- `expectedAmount` must match order total
- User can only have ONE pending proof per order (prevent duplicate submissions)

### Status Transitions

**Offline Payment Proof Status**:
```text
pending → approved (by admin)
        → rejected (by admin) → resubmitted (by user) → pending
```

**Order Payment Status** (for offline/COD):
```text
COD:     pending → collected (by driver/admin)
Offline: pending → verified (when proof approved) → collected (optional, for accounting)
Failed:  Any state → failed (if payment issues occur)
```

---

## Performance Considerations

### Read Optimization
- **Featured Offers**: Cached on mobile app startup, refreshed every 5 minutes
- **Payment Proofs**: Indexed by status for fast admin queue queries
- **COD Orders**: Composite index on paymentMethod + paymentStatus for filtering

### Write Optimization
- **Payment Verification**: Use Firestore transactions when updating proof status AND order status simultaneously
- **Analytics Tracking**: Use FieldValue.increment() for viewCount and addToCartCount (atomic operations)
- **Status History**: Append-only array (no updates to existing entries)

### Offline Support
- Featured offers cached locally (AsyncStorage) for offline viewing
- Payment proof uploads queued when offline, retried when online
- Order submission blocked if offline payment proof upload is pending

---

## Storage Considerations

### Firebase Storage Buckets

#### Transaction Proofs (`/transaction-proofs/`)
```
/transaction-proofs/
├── {userId}/
│   ├── {orderId}/
│   │   ├── {timestamp}.jpg       # Original upload
│   │   └── {timestamp}_thumb.jpg # Thumbnail (generated by Cloud Function)
```

- **Access**: User (owner) + Admins (all)
- **Retention**: Permanent (for audit trail)
- **Size Limits**: 5MB per image (enforced in rules + client)

#### Featured Offer Media (`/featured-offers/`)
```
/featured-offers/
├── {offerId}/
│   ├── media.{ext}      # Video (mp4) or Image (jpg/png)
│   └── thumbnail.jpg    # Thumbnail for admin preview
```

- **Access**: All authenticated users (read), Admins (write)
- **Retention**: Deleted when featured offer is deleted
- **Size Limits**: Images 5MB, Videos 20MB (enforced in rules)

---

## Migration & Versioning

### Schema Changes from Feature 001

**Orders Collection**:
- **Added fields**: paymentMethod, paymentStatus, codCollectedAmount, codCollectedAt, codCollectedBy, codNotes, offlinePaymentProofId
- **Backward compatibility**: All new fields are optional; existing orders continue to work
- **Default behavior**: Existing orders without payment fields assumed to be 'online' payment method with 'verified' status

### Data Migrations

**No migration required** for existing orders from feature 001:
- New fields have sensible defaults
- Firestore is schemaless; new fields appear only on new/updated documents
- Cloud Functions handle missing fields gracefully:
  ```typescript
  const paymentMethod = order.paymentMethod || 'online';  // Default to online
  const paymentStatus = order.paymentStatus || 'verified';  // Assume paid
  ```

### Versioning Strategy

If schema changes are needed in future:
1. Add new fields as optional
2. Use Cloud Functions to backfill data if needed
3. Maintain backward compatibility for at least one major version
4. Document breaking changes in migration guides

---

## Security Considerations

### Access Control

**Featured Offers**:
- Public read access (all authenticated users)
- Admin-only write access
- No sensitive data stored

**Payment Proofs**:
- User-scoped read (only own proofs)
- Admin read-all for verification
- Immutable once created (append-only status updates)
- Transaction images stored securely with scoped access

### Sensitive Data

**Transaction Images**:
- May contain sensitive financial information (bank account numbers, names)
- Access restricted to owner + admins only
- HTTPS-only URLs (enforced by Firebase Storage)
- Consider PII redaction in future enhancement (blur account numbers)

### Audit Trail

**Payment Proof Status History**:
- Every status change logged with timestamp and admin ID
- Immutable array (append-only)
- Enables compliance audits and dispute resolution

**Order Payment Changes**:
- Updates to paymentStatus logged in order statusHistory (from feature 001)
- Links to payment proof document for full audit trail

---

## Next Steps

See `contracts/` directory for Cloud Function API contracts and `quickstart.md` for development setup instructions.
