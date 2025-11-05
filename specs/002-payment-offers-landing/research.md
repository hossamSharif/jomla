# Research: Payment Options and Featured Offers Landing Page

**Feature**: 002-payment-offers-landing
**Date**: 2025-11-05
**Phase**: 0 - Research

## Overview

This document captures research findings and technology decisions for implementing alternative payment methods (COD, offline payment) and a featured offers landing page with video/image slideshow. Since this feature extends [001-grocery-store-app](../001-grocery-store-app/research.md), research focuses on NEW capabilities not covered by feature 001.

## Research Areas

### 1. Video Playback for Featured Offers

**Question**: How should video playback be implemented for full-screen featured offers with autoplay and looping?

**Decision**: Use `expo-av` library with `Video` component

**Rationale**:
- **expo-av** is the official Expo library for audio/video playback, well-maintained and documented
- Provides platform-consistent API for both iOS and Android
- Supports essential features: autoplay, looping, muted playback, playback state control
- Handles platform-specific video codecs automatically
- Memory-efficient for short promotional videos (<30 seconds typical)
- Integrates with Expo's asset system for optimized loading

**Alternatives Considered**:
- **react-native-video**: More feature-rich but requires bare workflow (not compatible with Expo managed workflow without custom dev client)
- **Native implementations**: Would require platform-specific code and violate cross-platform consistency
- **HTML5 video via WebView**: Poor performance, inconsistent behavior across platforms

**Implementation Pattern**:
```typescript
import { Video, ResizeMode } from 'expo-av';

<Video
  source={{ uri: offer.videoUrl }}
  rate={1.0}
  volume={0}  // Muted by default
  isMuted={true}
  resizeMode={ResizeMode.COVER}
  shouldPlay={isVisible}  // Autoplay when slide is visible
  isLooping
  style={{ width: '100%', height: '100%' }}
  onPlaybackStatusUpdate={(status) => {
    // Track playback state for analytics
  }}
/>
```

**Performance Considerations**:
- Pre-load next video while current is playing (useEffect with adjacent indices)
- Unload videos when not in viewport to conserve memory
- Limit video duration to 30 seconds max for file size and user attention
- Consider fallback to poster image if video fails to load

---

### 2. Image Upload and Validation

**Question**: How should transaction proof images be uploaded and validated before storage?

**Decision**: Use `expo-image-picker` for client-side selection + `expo-file-system` for validation + Sharp in Cloud Functions for server-side validation

**Rationale**:
- **expo-image-picker** provides native image selection UI on both platforms with consistent API
- **expo-file-system** allows pre-upload validation (file size, format) to fail fast and save bandwidth
- **Sharp** (Cloud Function) performs server-side image validation, resizing, and format conversion for security
- Multi-layer validation (client + server) ensures only valid images are stored
- Sharp is production-grade image processing library used widely in Node.js ecosystems

**Alternatives Considered**:
- **react-native-image-picker**: Similar capabilities but expo-image-picker has better TypeScript support and Expo integration
- **Client-side validation only**: Insecure, users can bypass validation
- **Firebase Storage rules only**: Limited validation capabilities, can't resize or optimize images

**Implementation Pattern**:

**Client (Mobile)**:
```typescript
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

// Select image
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.8,  // Compress for faster upload
});

// Validate file size client-side
const fileInfo = await FileSystem.getInfoAsync(result.uri);
if (fileInfo.size > 5 * 1024 * 1024) {  // 5MB limit
  throw new Error('Image must be under 5MB');
}

// Upload to Firebase Storage
const storageRef = ref(storage, `/transaction-proofs/${userId}/${orderId}/${Date.now()}.jpg`);
await uploadBytes(storageRef, blob);
```

**Server (Cloud Function)**:
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import sharp from 'sharp';

export const validateTransactionImage = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name;

  // Download image
  const bucket = admin.storage().bucket();
  const tempFilePath = `/tmp/${Date.now()}.jpg`;
  await bucket.file(filePath).download({ destination: tempFilePath });

  // Validate and optimize
  const metadata = await sharp(tempFilePath).metadata();

  // Validate format
  if (!['jpeg', 'png'].includes(metadata.format)) {
    await bucket.file(filePath).delete();
    throw new functions.https.HttpsError('invalid-argument', 'Only JPG/PNG allowed');
  }

  // Resize if too large (max 1920x1920)
  await sharp(tempFilePath)
    .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(tempFilePath + '.optimized');

  // Replace original with optimized
  await bucket.upload(tempFilePath + '.optimized', {
    destination: filePath,
    metadata: { contentType: 'image/jpeg' }
  });
});
```

**Validation Rules**:
- **Client-side**: File size (max 5MB), format hint (JPG/PNG)
- **Server-side**: Actual format validation, dimension limits, content type, malware scan (future enhancement)

---

### 3. Firebase Storage Security Rules

**Question**: How should Firebase Storage be secured for user-uploaded transaction proof images?

**Decision**: Implement restrictive security rules with user-scoped access

**Rationale**:
- Users should only upload to their own directory: `/transaction-proofs/{userId}/`
- Users should only read their own uploaded images
- Admins need read access to all transaction proofs for verification
- Files should be write-once (no updates/deletes by users after upload)
- Size limits enforced at Storage Rules level as final defense

**Implementation**:

**firebase/storage.rules**:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Transaction proof images
    match /transaction-proofs/{userId}/{orderId}/{fileName} {
      // Users can upload to their own directory only
      allow create: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size <= 5 * 1024 * 1024  // 5MB limit
        && request.resource.contentType.matches('image/(jpeg|png)');

      // Users can read their own images
      allow read: if request.auth != null
        && request.auth.uid == userId;

      // Admins can read all images for verification
      allow read: if request.auth.token.admin == true;

      // No updates or deletes by users (immutable audit trail)
      allow update, delete: if false;

      // Admins can delete invalid images
      allow delete: if request.auth.token.admin == true;
    }

    // Featured offer media (videos/images)
    match /featured-offers/{offerId}/{fileName} {
      // Only admins can write
      allow create, update, delete: if request.auth.token.admin == true;

      // All authenticated users can read
      allow read: if request.auth != null;
    }
  }
}
```

**Security Principles**:
- Principle of least privilege: Users get minimal necessary access
- Immutability: Transaction proofs can't be modified (audit trail integrity)
- Admin oversight: Only admins can manage featured offer media
- Defense in depth: Size/type validation at multiple layers

---

### 4. Payment Verification Workflow

**Question**: What workflow should admins follow to verify offline payment submissions?

**Decision**: Queue-based workflow with Firestore triggers and status transitions

**Rationale**:
- Queue pattern ensures no payment verification is missed
- Firestore triggers automate notification sending
- Status transitions provide clear audit trail
- Admins can batch-process verifications efficiently
- Real-time updates keep customers informed

**Workflow States**:
1. **pending** - User submitted payment proof, awaiting admin review
2. **approved** - Admin verified transaction is valid, order can proceed
3. **rejected** - Admin rejected (invalid transaction, wrong amount, etc.)
4. **resubmitted** - User resubmitted after rejection

**Implementation Pattern**:

**Firestore Collection** (`offlinePaymentProofs`):
```typescript
interface OfflinePaymentProof {
  id: string;
  orderId: string;
  userId: string;
  transactionId: string;  // User-provided
  transactionImageUrl: string;  // Firebase Storage URL
  amount: number;  // Expected amount in cents
  status: 'pending' | 'approved' | 'rejected' | 'resubmitted';
  submittedAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;  // Admin UID
  rejectionReason?: string;
  adminNotes?: string;
}
```

**Cloud Function** (Auto-trigger on status change):
```typescript
export const onPaymentStatusChange = functions.firestore
  .document('offlinePaymentProofs/{proofId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Status changed to approved
    if (before.status !== 'approved' && after.status === 'approved') {
      // Update order status
      await admin.firestore().collection('orders').doc(after.orderId).update({
        'paymentStatus': 'verified',
        'status': 'confirmed'
      });

      // Send notification to customer
      await sendPushNotification(after.userId, {
        title: 'Payment Approved',
        body: 'Your payment has been verified. Your order is being prepared!'
      });
    }

    // Status changed to rejected
    if (before.status !== 'rejected' && after.status === 'rejected') {
      await sendPushNotification(after.userId, {
        title: 'Payment Issue',
        body: `Payment verification failed: ${after.rejectionReason}`
      });
    }
  });
```

**Admin Dashboard UI Flow**:
1. View queue of pending verifications (sorted by submission time)
2. Click payment proof to view full details (transaction image, user info, order details)
3. Zoom/pan transaction image for verification
4. Compare transaction ID and amount with expected values
5. Approve or Reject with optional notes
6. Move to next in queue

---

### 5. Featured Offers Carousel UX Pattern

**Question**: What UX pattern should be used for the featured offers landing page carousel?

**Decision**: Full-screen swipeable carousel with pagination dots and skip option

**Rationale**:
- Full-screen maximizes visual impact for promotional content
- Swipe gesture is intuitive on mobile (established pattern)
- Pagination dots show progress and number of offers
- Skip/close option prevents user frustration if not interested
- Auto-advance (optional) with pause-on-interaction prevents annoyance
- Video autoplay with mute ensures accessibility compliance

**UX Components**:
1. **Full-screen slides**: Each offer takes entire viewport
2. **Swipe navigation**: Left/right swipe to move between offers
3. **Pagination dots**: Bottom-center, shows current position
4. **Close button**: Top-right corner, navigates to main app
5. **Add to Cart CTA**: Bottom overlay, prominent and always visible
6. **Auto-advance** (optional): 10-second delay per slide, resets on user interaction

**Implementation Library**: `react-native-reanimated` + `react-native-gesture-handler`

**Accessibility Considerations**:
- Videos muted by default (WCAG compliance)
- Screen reader support for offer titles/descriptions
- Alternative navigation (arrow buttons) for users who can't swipe
- Respect "reduce motion" system preference (disable auto-advance)

**Pattern Reference**:
- Instagram Stories (swipe + pagination)
- Snapchat Discover (full-screen video)
- Pinterest Pin (image focus + CTA overlay)

---

### 6. Cash on Delivery (COD) State Management

**Question**: How should COD orders be tracked from placement through payment collection?

**Decision**: Extend Order entity with payment-specific fields + separate payment status tracking

**Rationale**:
- COD requires different workflow than prepaid orders
- Payment collection happens at delivery, not checkout
- Drivers need to mark payment as received
- Admins need visibility into uncollected payments
- Status tracking enables reconciliation and reporting

**COD-Specific Fields** (in Orders collection):
```typescript
interface Order {
  // ... existing fields from feature 001

  // NEW: Payment fields
  paymentMethod: 'cod' | 'offline' | 'online';
  paymentStatus: 'pending' | 'verified' | 'collected' | 'failed';
  codCollectedAmount?: number;  // Actual amount collected (may differ)
  codCollectedAt?: Timestamp;
  codCollectedBy?: string;  // Driver UID
}
```

**COD Workflow States**:
1. **Order placed** → paymentMethod: 'cod', paymentStatus: 'pending'
2. **Order out for delivery** → No payment status change
3. **Order delivered + payment collected** → paymentStatus: 'collected', codCollectedAt: now
4. **Payment collection failed** → paymentStatus: 'failed', order status: 'pending_payment'

**Admin Dashboard Views**:
- **COD Orders List**: All orders with paymentMethod='cod'
- **Pending Collection**: Orders delivered but payment not yet collected
- **Collection Summary**: Daily/weekly COD collection totals
- **Failed Collections**: Orders where COD payment failed (customer unavailable, insufficient cash, etc.)

**Driver App Considerations** (Future Enhancement):
- Mark COD payment as collected via mobile interface
- Record actual amount collected (may differ if change issues)
- Photo proof of delivered + collected (optional)

---

## Summary of Technology Decisions

| Technology | Purpose | Justification |
|------------|---------|---------------|
| expo-av | Video playback for featured offers | Official Expo library, cross-platform, autoplay/loop support |
| expo-image-picker | Transaction proof image selection | Native UI, TypeScript support, Expo integration |
| expo-file-system | Client-side file validation | Pre-upload validation saves bandwidth |
| Sharp (Cloud Function) | Server-side image validation | Production-grade, security validation, optimization |
| Firebase Storage Rules | Access control for uploaded images | User-scoped access, immutable audit trail |
| Firestore Triggers | Payment status automation | Real-time updates, decoupled architecture |
| react-native-reanimated | Carousel smooth transitions | Performance, 60fps animations |

## Open Questions / Future Research

1. **Analytics**: How to track featured offers engagement (view time, conversion rate)?
2. **Offline Support**: How to handle featured offers when user is offline during app launch?
3. **A/B Testing**: How to test different featured offer sequences for conversion optimization?
4. **Video CDN**: Should videos be served via CDN for better global performance?
5. **Payment Gateway Integration**: Future online payment methods (credit card, digital wallets)?

## Next Steps

Proceed to Phase 1:
- Generate data-model.md with extended Firestore schema
- Create API contracts for payment verification and featured offers CRUD
- Document quickstart setup for new dependencies
