# Firestore Security Rules Contract

**Feature**: Grocery Store Mobile App with Admin Dashboard
**Date**: 2025-11-05
**Phase**: 1 - Design

## Overview

This document defines the security rules for Firestore collections. These rules control who can read and write data at the database level.

## Rules Syntax

Firebase Security Rules use a custom syntax:
- `match /collection/{docId}` - Define a rule for a collection
- `allow read, write` - Grant permissions
- `if condition` - Add conditions
- `request.auth` - Current authenticated user
- `resource.data` - Existing document data
- `request.resource.data` - Incoming document data

## Complete Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ============================================
    // Helper Functions
    // ============================================

    function isAuthenticated() {
      return request.auth != null;
    }

    function isAdmin() {
      return request.auth.token.admin == true;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    function isValidEmail(email) {
      return email.matches('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$');
    }

    function isValidPhoneNumber(phone) {
      return phone.matches('^\\+[1-9]\\d{1,14}$');  // E.164 format
    }

    // ============================================
    // Users Collection
    // ============================================

    match /users/{userId} {
      // Users can read their own profile
      allow read: if isAuthenticated() && isOwner(userId);

      // Users can create their own profile during registration
      allow create: if isAuthenticated()
        && isOwner(userId)
        && request.resource.data.email is string
        && isValidEmail(request.resource.data.email)
        && request.resource.data.phoneNumber is string
        && isValidPhoneNumber(request.resource.data.phoneNumber)
        && request.resource.data.firstName is string
        && request.resource.data.lastName is string
        && request.resource.data.isPhoneVerified == false;  // Must verify

      // Users can update limited fields in their own profile
      allow update: if isAuthenticated()
        && isOwner(userId)
        && request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly([
            'firstName',
            'lastName',
            'fcmTokens',
            'lastLoginAt',
            'sessionExpiresAt',
            'updatedAt'
          ]);

      // Users cannot delete their own profile (admin only)
      allow delete: if isAdmin();
    }

    // ============================================
    // Products Collection
    // ============================================

    match /products/{productId} {
      // Any authenticated user can read active products
      allow read: if isAuthenticated()
        && resource.data.status == 'active';

      // Only admins can read inactive products
      allow read: if isAdmin();

      // Only admins can create products
      allow create: if isAdmin()
        && request.resource.data.name is string
        && request.resource.data.name.size() > 0
        && request.resource.data.basePrice is int
        && request.resource.data.basePrice > 0
        && request.resource.data.minQuantity is int
        && request.resource.data.minQuantity >= 1
        && request.resource.data.maxQuantity is int
        && request.resource.data.maxQuantity >= request.resource.data.minQuantity
        && request.resource.data.status in ['active', 'inactive'];

      // Only admins can update products
      allow update: if isAdmin();

      // Only admins can delete products
      allow delete: if isAdmin();
    }

    // ============================================
    // Offers Collection
    // ============================================

    match /offers/{offerId} {
      // Any authenticated user can read active, valid offers
      allow read: if isAuthenticated()
        && resource.data.status == 'active'
        && (resource.data.validFrom == null || resource.data.validFrom <= request.time)
        && (resource.data.validUntil == null || resource.data.validUntil >= request.time);

      // Admins can read all offers (including drafts and inactive)
      allow read: if isAdmin();

      // Only admins can create offers
      allow create: if isAdmin()
        && request.resource.data.name is string
        && request.resource.data.name.size() > 0
        && request.resource.data.products is list
        && request.resource.data.products.size() > 0
        && request.resource.data.originalTotal is int
        && request.resource.data.discountedTotal is int
        && request.resource.data.discountedTotal < request.resource.data.originalTotal
        && request.resource.data.status in ['draft', 'active', 'inactive'];

      // Only admins can update offers
      allow update: if isAdmin();

      // Only admins can delete offers
      allow delete: if isAdmin();
    }

    // ============================================
    // Carts Collection
    // ============================================

    match /carts/{userId} {
      // Users can only access their own cart
      allow read: if isAuthenticated() && isOwner(userId);

      // Users can create their own cart
      allow create: if isAuthenticated()
        && isOwner(userId)
        && request.resource.data.userId == userId;

      // Users can update their own cart
      allow update: if isAuthenticated()
        && isOwner(userId)
        && request.resource.data.userId == userId;

      // Users can delete their own cart
      allow delete: if isAuthenticated() && isOwner(userId);
    }

    // ============================================
    // Orders Collection
    // ============================================

    match /orders/{orderId} {
      // Users can read their own orders
      allow read: if isAuthenticated()
        && isOwner(resource.data.userId);

      // Admins can read all orders
      allow read: if isAdmin();

      // Users can create orders (validation happens in Cloud Function)
      allow create: if isAuthenticated()
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.status == 'pending'
        && request.resource.data.fulfillmentMethod in ['delivery', 'pickup']
        && (
          (request.resource.data.fulfillmentMethod == 'delivery'
            && request.resource.data.deliveryDetails is map
            && request.resource.data.deliveryDetails.address is string
            && request.resource.data.deliveryDetails.city is string
            && request.resource.data.deliveryDetails.postalCode is string)
          ||
          (request.resource.data.fulfillmentMethod == 'pickup'
            && request.resource.data.pickupDetails is map
            && request.resource.data.pickupDetails.pickupTime is timestamp)
        );

      // Users can update their own pending orders (cancel only)
      allow update: if isAuthenticated()
        && isOwner(resource.data.userId)
        && resource.data.status == 'pending'
        && request.resource.data.status == 'cancelled';

      // Only admins can update order status
      allow update: if isAdmin();

      // Only admins can delete orders
      allow delete: if isAdmin();
    }

    // ============================================
    // Admin Users Collection
    // ============================================

    match /adminUsers/{adminId} {
      // Only authenticated admins can read admin user data
      allow read: if isAdmin();

      // Only super admins can create admin users
      allow create: if isAdmin()
        && get(/databases/$(database)/documents/adminUsers/$(request.auth.uid)).data.role == 'super_admin'
        && request.resource.data.role in ['super_admin', 'admin', 'viewer'];

      // Only super admins can update admin users
      allow update: if isAdmin()
        && get(/databases/$(database)/documents/adminUsers/$(request.auth.uid)).data.role == 'super_admin';

      // Only super admins can delete admin users
      allow delete: if isAdmin()
        && get(/databases/$(database)/documents/adminUsers/$(request.auth.uid)).data.role == 'super_admin';
    }

    // ============================================
    // Notifications Collection
    // ============================================

    match /notifications/{notificationId} {
      // Users can read their own notifications
      allow read: if isAuthenticated()
        && (resource.data.targetType == 'all'
          || (resource.data.targetType == 'user' && resource.data.targetUserId == request.auth.uid));

      // Admins can read all notifications
      allow read: if isAdmin();

      // Only Cloud Functions and admins can create notifications
      allow create: if isAdmin();

      // Only admins can update/delete notifications
      allow update, delete: if isAdmin();
    }

    // ============================================
    // Deny All Other Collections
    // ============================================

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Rule Explanations

### Users Collection Rules

**Read**:
- Users can only read their own profile
- Prevents data leakage between users

**Create**:
- Validates email and phone number format
- Ensures `isPhoneVerified` starts as `false`
- User can only create document with their own UID

**Update**:
- Users can only update specific fields (firstName, lastName, fcmTokens, etc.)
- Cannot modify email, phone, or verification status (prevents self-verification)
- Uses `diff().affectedKeys()` to whitelist updatable fields

**Delete**:
- Only admins can delete user accounts

### Products Collection Rules

**Read**:
- Regular users can only read active products
- Admins can read all products (including inactive)

**Write**:
- Only admins can create/update/delete products
- Validates required fields and constraints (price > 0, min <= max quantity)

### Offers Collection Rules

**Read**:
- Regular users can only read active offers within validity period
- Admins can read all offers (drafts, expired, inactive)

**Write**:
- Only admins can create/update/delete offers
- Validates offer structure (has products, pricing makes sense)

### Carts Collection Rules

**Read/Write**:
- Users can only access their own cart (document ID = user ID)
- Strict ownership check prevents cart hijacking

### Orders Collection Rules

**Read**:
- Users can read their own orders
- Admins can read all orders

**Create**:
- Users can create orders assigned to themselves
- Validates fulfillment method and required details
- Cloud Function provides additional validation

**Update**:
- Users can only cancel their own pending orders
- Admins can update any order status

### Admin Users Collection Rules

**Read/Write**:
- Only admins can access admin user data
- Only super admins can create/update/delete admin users
- Uses `get()` to fetch caller's role from database

### Notifications Collection Rules

**Read**:
- Users can read notifications targeted to them or to all users
- Admins can read all notifications

**Write**:
- Only admins and Cloud Functions can create notifications

## Security Best Practices

### 1. Least Privilege
- Users only have access to their own data
- Admins have full access but must be explicitly marked

### 2. Validation at Multiple Layers
- Client-side: Immediate feedback
- Security Rules: Protection against malicious clients
- Cloud Functions: Business logic validation

### 3. Denormalization Safety
- Rules check both read and write permissions
- Denormalized data (in carts/orders) can't be modified to reference other users

### 4. Admin Authentication
- Custom claims (`admin: true`) set via Cloud Functions
- Super admin role stored in database for granular permissions

### 5. Rate Limiting
- Rules don't enforce rate limiting (done in Cloud Functions)
- Firestore has built-in DDoS protection

## Testing Security Rules

Use Firebase Emulator Suite with rules unit tests:

```javascript
// Example test
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

describe('Users collection', () => {
  it('allows users to read their own profile', async () => {
    const db = getFirestore('user123');
    const doc = db.collection('users').doc('user123');
    await assertSucceeds(doc.get());
  });

  it('denies users from reading other profiles', async () => {
    const db = getFirestore('user123');
    const doc = db.collection('users').doc('user456');
    await assertFails(doc.get());
  });
});
```

See `quickstart.md` for complete testing setup.

## Deployment

Deploy rules using Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

Test rules before deployment:
```bash
firebase emulators:start --only firestore
npm test
```

## Common Pitfalls

### 1. Forgetting to Check Authentication
❌ `allow read: if true;`
✅ `allow read: if isAuthenticated();`

### 2. Using `get()` Without Indexes
- `get()` calls count toward document reads
- Use sparingly (only for admin role checks)

### 3. Over-Relying on Rules for Business Logic
- Rules are for security, not complex validation
- Use Cloud Functions for business logic

### 4. Not Testing Rules Thoroughly
- Always test both positive and negative cases
- Test as different user roles

## Next Steps

See `cloud-functions.md` for Cloud Function contracts and `quickstart.md` for development setup.
