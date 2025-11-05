# Cloud Functions API Contracts

**Feature**: Grocery Store Mobile App with Admin Dashboard
**Date**: 2025-11-05
**Phase**: 1 - Design

## Overview

This document defines the API contracts for Firebase Cloud Functions used in the grocery store application. These functions handle server-side logic that requires privileged access, security validation, or integration with external services.

All functions follow Firebase callable function conventions:
- Request data is passed as the first parameter
- Authentication context is in the second parameter (`context.auth`)
- Responses return data objects or throw `HttpsError`

## Authentication Functions

### `sendVerificationCode`

Sends an SMS verification code for account confirmation or password reset.

**Type**: Callable HTTPS Function

**Request**:
```typescript
interface SendVerificationCodeRequest {
  phoneNumber: string;            // E.164 format: +1234567890
  type: 'registration' | 'password_reset';
}
```

**Response**:
```typescript
interface SendVerificationCodeResponse {
  success: boolean;
  expiresAt: number;              // Unix timestamp (30 minutes from now)
  attemptsRemaining: number;      // 3 - current attempts (for rate limiting)
}
```

**Errors**:
- `invalid-argument`: Invalid phone number format
- `failed-precondition`: Rate limit exceeded (3 attempts in 1 hour)
- `not-found`: Phone number not registered (password_reset only)
- `unavailable`: SMS service unavailable

**Implementation Notes**:
- Uses Twilio Verify API for code generation and delivery
- Stores hashed verification code in `users/{userId}` document
- Tracks attempts in `verificationAttempts` field
- Code expires after 30 minutes (`verificationCodeExpiry`)

**Security**:
- Unauthenticated (required for registration)
- Rate limited to 3 attempts per hour per phone number

---

### `verifyCode`

Verifies an SMS code for account activation or password reset.

**Type**: Callable HTTPS Function

**Request**:
```typescript
interface VerifyCodeRequest {
  phoneNumber: string;
  code: string;                   // 6-digit verification code
  type: 'registration' | 'password_reset';
}
```

**Response**:
```typescript
interface VerifyCodeResponse {
  success: boolean;
  customToken?: string;           // Firebase custom auth token (registration only)
}
```

**Errors**:
- `invalid-argument`: Invalid code format
- `not-found`: No pending verification for this phone number
- `deadline-exceeded`: Verification code expired
- `permission-denied`: Code does not match

**Implementation Notes**:
- Compares provided code with hashed code in database
- For registration: Sets `isPhoneVerified = true` and returns custom token
- For password reset: Returns success, client can then update password

**Security**:
- Unauthenticated (required for registration/password reset)
- Code is single-use (deleted after verification)

---

### `resetPassword`

Resets user password after successful SMS verification.

**Type**: Callable HTTPS Function

**Request**:
```typescript
interface ResetPasswordRequest {
  phoneNumber: string;
  newPassword: string;            // Minimum 8 characters
  verificationToken: string;      // Token from verifyCode response
}
```

**Response**:
```typescript
interface ResetPasswordResponse {
  success: boolean;
}
```

**Errors**:
- `invalid-argument`: Password too short (<8 characters)
- `permission-denied`: Invalid verification token
- `deadline-exceeded`: Verification token expired (5 minutes)

**Implementation Notes**:
- Verifies token before allowing password change
- Uses Firebase Admin SDK to update password
- Clears verification token after use

**Security**:
- Unauthenticated but requires valid verification token
- Token expires after 5 minutes

---

## Cart & Order Functions

### `validateCart`

Validates cart contents before checkout, checking for quantity limits and offer availability.

**Type**: Callable HTTPS Function

**Request**:
```typescript
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
```

**Response**:
```typescript
interface ValidateCartResponse {
  isValid: boolean;
  errors: Array<{
    type: 'offer_unavailable' | 'offer_changed' | 'quantity_exceeded' | 'product_unavailable';
    itemId: string;             // offerId or productId
    message: string;
    maxAllowed?: number;        // For quantity_exceeded errors
  }>;
}
```

**Errors**:
- `unauthenticated`: User not logged in
- `invalid-argument`: Invalid cart structure

**Implementation Notes**:
- Checks all offers are still active and unchanged
- Validates quantity limits for each item
- Returns detailed error messages for client display

**Security**:
- Requires authentication
- User can only validate their own cart

---

### `createOrder`

Creates an order from cart contents with full validation.

**Type**: Callable HTTPS Function

**Request**:
```typescript
interface CreateOrderRequest {
  cartId: string;                 // User's cart document ID
  fulfillmentMethod: 'delivery' | 'pickup';
  deliveryDetails?: {
    address: string;
    city: string;
    postalCode: string;
    notes?: string;
  };
  pickupDetails?: {
    pickupTime: number;           // Unix timestamp
  };
}
```

**Response**:
```typescript
interface CreateOrderResponse {
  orderId: string;
  orderNumber: string;            // Human-readable: ORD-20251105-0001
  total: number;                  // Final total in cents
  estimatedDelivery?: number;     // Unix timestamp (delivery only)
}
```

**Errors**:
- `unauthenticated`: User not logged in
- `failed-precondition`: Cart validation failed (offer changed, quantity exceeded)
- `invalid-argument`: Missing fulfillment details
- `resource-exhausted`: Pickup time slot full

**Implementation Notes**:
- Re-validates entire cart before order creation (security boundary)
- Creates order document with full item snapshots
- Clears user's cart on success
- Triggers invoice generation (async)
- Sends order confirmation notification

**Security**:
- Requires authentication
- Uses transaction to prevent race conditions
- User can only create orders from their own cart

---

### `generateInvoice`

Generates a PDF invoice for a completed order.

**Type**: Background Firestore Trigger

**Trigger**: `orders/{orderId}` onCreate or onUpdate (when status = 'confirmed')

**Implementation**:
```typescript
exports.generateInvoice = functions.firestore
  .document('orders/{orderId}')
  .onWrite(async (change, context) => {
    const order = change.after.data();
    if (!order || order.status !== 'confirmed') return;

    // Generate PDF using pdfkit or puppeteer
    const pdfBuffer = await createInvoicePDF(order);

    // Upload to Firebase Storage
    const fileName = `invoices/${order.id}/${order.orderNumber}.pdf`;
    const file = bucket.file(fileName);
    await file.save(pdfBuffer);

    // Update order with invoice URL
    await change.after.ref.update({
      invoiceUrl: await file.getSignedUrl({
        action: 'read',
        expires: '03-01-2500', // Far future
      }),
    });
  });
```

**Invoice Structure**:
- Header: Store name, order number, date
- Customer: Name, delivery/pickup details
- Items:
  - Offer items with product breakdown
  - Individual products
  - Prices with discounts highlighted
- Totals: Subtotal, savings, tax, delivery fee, total

**Error Handling**:
- Retries on failure (Firebase default: 3 retries with exponential backoff)
- Logs errors to Cloud Logging
- Sets order flag `invoiceGenerationFailed` if all retries fail

---

## Notification Functions

### `sendOfferNotification`

Sends push notification when a new offer is published.

**Type**: Background Firestore Trigger

**Trigger**: `offers/{offerId}` onUpdate (when status changes to 'active')

**Implementation**:
```typescript
exports.sendOfferNotification = functions.firestore
  .document('offers/{offerId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only send when offer becomes active
    if (before.status !== 'active' && after.status === 'active') {
      const message = {
        notification: {
          title: 'New Offer Available!',
          body: `${after.name} - Save ${after.savingsPercentage}%`,
        },
        data: {
          type: 'new_offer',
          offerId: context.params.offerId,
        },
        topic: 'all-users',
      };

      await admin.messaging().send(message);

      // Log notification
      await admin.firestore().collection('notifications').add({
        type: 'new_offer',
        title: message.notification.title,
        body: message.notification.body,
        targetType: 'topic',
        targetTopic: 'all-users',
        relatedOfferId: context.params.offerId,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        deliveryStatus: 'sent',
      });
    }
  });
```

**Notification Payload**:
- Title: "New Offer Available!"
- Body: Offer name + savings percentage
- Deep link: Opens offer details screen in mobile app

---

### `sendOrderStatusNotification`

Sends push notification when order status changes.

**Type**: Background Firestore Trigger

**Trigger**: `orders/{orderId}` onUpdate (when status changes)

**Implementation**:
```typescript
exports.sendOrderStatusNotification = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status === after.status) return;

    const statusMessages = {
      confirmed: 'Your order has been confirmed!',
      preparing: 'Your order is being prepared',
      out_for_delivery: 'Your order is on the way!',
      ready_for_pickup: 'Your order is ready for pickup',
      completed: 'Your order has been delivered. Thanks!',
      cancelled: 'Your order has been cancelled',
    };

    const user = await admin.firestore().doc(`users/${after.userId}`).get();
    const fcmTokens = user.data()?.fcmTokens || [];

    if (fcmTokens.length === 0) return;

    const message = {
      notification: {
        title: `Order ${after.orderNumber}`,
        body: statusMessages[after.status],
      },
      data: {
        type: 'order_status',
        orderId: context.params.orderId,
        status: after.status,
      },
      tokens: fcmTokens,
    };

    const response = await admin.messaging().sendMulticast(message);

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const tokensToRemove: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          tokensToRemove.push(fcmTokens[idx]);
        }
      });
      if (tokensToRemove.length > 0) {
        await user.ref.update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
        });
      }
    }
  });
```

---

## Cart Validation Functions

### `invalidateCartsOnOfferChange`

Marks carts as invalid when an offer is modified or deleted.

**Type**: Background Firestore Trigger

**Trigger**: `offers/{offerId}` onUpdate or onDelete

**Implementation**:
```typescript
exports.invalidateCartsOnOfferChange = functions.firestore
  .document('offers/{offerId}')
  .onWrite(async (change, context) => {
    const offerId = context.params.offerId;
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    // Check if offer was deleted or changed
    const wasDeleted = !after;
    const wasChanged = before && after && (
      before.discountedTotal !== after.discountedTotal ||
      before.status !== after.status
    );

    if (!wasDeleted && !wasChanged) return;

    // Find all carts containing this offer
    const cartsSnapshot = await admin.firestore()
      .collection('carts')
      .where('offers', 'array-contains-any', [{ offerId }])
      .get();

    const batch = admin.firestore().batch();

    cartsSnapshot.docs.forEach(cartDoc => {
      batch.update(cartDoc.ref, {
        hasInvalidItems: true,
        invalidOfferIds: admin.firestore.FieldValue.arrayUnion(offerId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
  });
```

**Notes**:
- Runs in background when admin modifies/deletes offers
- Client checks `hasInvalidItems` flag when cart is opened
- User must remove invalid items before checkout

---

## Admin Functions

### `createAdminUser`

Creates a new admin user with specified role and permissions.

**Type**: Callable HTTPS Function

**Request**:
```typescript
interface CreateAdminUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'admin' | 'viewer';
}
```

**Response**:
```typescript
interface CreateAdminUserResponse {
  uid: string;
  email: string;
}
```

**Errors**:
- `unauthenticated`: Not logged in
- `permission-denied`: Caller is not super admin
- `already-exists`: Email already in use
- `invalid-argument`: Invalid email or weak password

**Implementation Notes**:
- Only super admins can create admin users
- Sets custom claim `admin: true` on user account
- Creates document in `adminUsers` collection

**Security**:
- Requires authentication
- Caller must have `role === 'super_admin'`

---

## Utility Functions

### `cleanupExpiredVerificationCodes`

Scheduled function to clean up expired verification codes.

**Type**: Scheduled Function (Pub/Sub)

**Schedule**: Every 1 hour

**Implementation**:
```typescript
exports.cleanupExpiredVerificationCodes = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('verificationCodeExpiry', '<', now)
      .get();

    const batch = admin.firestore().batch();

    usersSnapshot.docs.forEach(userDoc => {
      batch.update(userDoc.ref, {
        verificationCodeHash: admin.firestore.FieldValue.delete(),
        verificationCodeExpiry: admin.firestore.FieldValue.delete(),
        verificationAttempts: 0,
      });
    });

    await batch.commit();
    console.log(`Cleaned up ${usersSnapshot.size} expired verification codes`);
  });
```

---

## Error Handling

All Cloud Functions follow this error handling pattern:

```typescript
import { HttpsError } from 'firebase-functions/v2/https';

try {
  // Function logic
} catch (error) {
  console.error('Function error:', error);

  if (error instanceof HttpsError) {
    throw error;
  }

  throw new HttpsError('internal', 'An unexpected error occurred', error);
}
```

### Standard Error Codes

| Code | Usage |
|------|-------|
| `invalid-argument` | Invalid request data (bad format, missing fields) |
| `unauthenticated` | User not logged in |
| `permission-denied` | User lacks required permissions |
| `not-found` | Resource doesn't exist |
| `already-exists` | Resource already exists (duplicate) |
| `failed-precondition` | Operation failed validation (cart invalid, rate limit) |
| `deadline-exceeded` | Operation timed out (verification expired) |
| `resource-exhausted` | Quota exceeded (too many requests) |
| `unavailable` | Service temporarily unavailable |
| `internal` | Unexpected server error |

## Rate Limiting

Cloud Functions have built-in rate limiting:
- 1000 concurrent executions per function (default)
- 10 GB/s network egress (default)

Additional rate limiting:
- SMS verification: 3 attempts per hour (enforced in function logic)
- Order creation: Firestore transaction prevents race conditions

## Deployment

Functions are deployed using Firebase CLI:

```bash
firebase deploy --only functions
```

Individual function deployment:
```bash
firebase deploy --only functions:sendVerificationCode
```

## Testing

All functions can be tested locally using Firebase Emulator Suite:

```bash
firebase emulators:start --only functions,firestore,auth
```

See `quickstart.md` for detailed testing setup.

## Next Steps

See `quickstart.md` for local development setup and testing instructions.
