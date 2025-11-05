# Quickstart Guide: Payment Options and Featured Offers

**Feature**: 002-payment-offers-landing
**Date**: 2025-11-05
**Prerequisites**: Feature [001-grocery-store-app](../001-grocery-store-app/quickstart.md) must be set up first

## Overview

This guide covers setup for implementing alternative payment methods (COD, offline payment) and the featured offers landing page. Since this feature extends feature 001, you should already have the base infrastructure running.

## Prerequisites

Ensure you have completed feature 001 setup:
- ✅ Firebase project configured
- ✅ Firestore emulator running
- ✅ Mobile app (Expo) running
- ✅ Admin dashboard (Next.js) running
- ✅ Cloud Functions deployed or running locally

## 1. Install New Dependencies

### Mobile App (React Native)

```bash
cd mobile
npm install expo-av expo-image-picker expo-file-system react-native-reanimated
```

**Dependencies**:
- `expo-av`: Video playback for featured offers
- `expo-image-picker`: Transaction proof image selection
- `expo-file-system`: File size validation before upload
- `react-native-reanimated`: Smooth carousel transitions

### Cloud Functions

```bash
cd functions
npm install sharp
```

**Dependencies**:
- `sharp`: Image validation and optimization for transaction proofs

### Admin Dashboard

No new dependencies required - uses existing shadcn/ui components from feature 001.

## 2. Configure Firebase Storage

### Update Storage Rules

Edit `firebase/storage.rules` and add rules for transaction proofs and featured offer media:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // ... existing rules from feature 001

    // NEW: Transaction proof images
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

      // No updates or deletes by users
      allow update, delete: if false;

      // Admins can delete invalid images
      allow delete: if request.auth.token.admin == true;
    }

    // NEW: Featured offer media (videos/images)
    match /featured-offers/{offerId}/{fileName} {
      // Only admins can write
      allow create, update, delete: if request.auth.token.admin == true;

      // All authenticated users can read
      allow read: if request.auth != null;
    }
  }
}
```

Deploy storage rules:
```bash
firebase deploy --only storage
```

## 3. Update Firestore Schema

### Add New Collections

Feature 002 adds two new collections. Create them in Firestore (they'll be auto-created on first write, but we can seed data):

**Featured Offers**:
```javascript
// Run in Firestore console or via Cloud Function
db.collection('featuredOffers').doc('example-1').set({
  title: 'Weekend Special',
  description: 'Save 40% on fresh produce',
  mediaType: 'image',
  mediaUrl: 'https://via.placeholder.com/1080x1920',
  linkedOfferId: null,
  linkedProductIds: ['prod_123', 'prod_456'],
  displayOrder: 1,
  backgroundColor: '#FF6B35',
  ctaText: 'Add to Cart',
  ctaAction: 'add_to_cart',
  status: 'active',
  publishedAt: admin.firestore.FieldValue.serverTimestamp(),
  expiresAt: null,
  viewCount: 0,
  addToCartCount: 0,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  createdBy: 'admin_initial_setup'
});
```

### Update Firestore Indexes

Edit `firebase/firestore.indexes.json` and add new indexes:

```json
{
  "indexes": [
    // ... existing indexes from feature 001

    // NEW: Orders by payment method and status
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
    },

    // NEW: Featured offers by status and display order
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
    },

    // NEW: Offline payment proofs by status
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
  ],
  "fieldOverrides": []
}
```

Deploy indexes:
```bash
firebase deploy --only firestore:indexes
```

**Note**: Index creation can take several minutes. Monitor progress in Firebase Console.

### Update Firestore Security Rules

Edit `firebase/firestore.rules` and add rules for new collections:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ... existing rules from feature 001

    // NEW: Featured Offers
    match /featuredOffers/{offerId} {
      // Any authenticated user can read active, non-expired offers
      allow read: if request.auth != null
        && resource.data.status == 'active'
        && (resource.data.expiresAt == null || resource.data.expiresAt > request.time);

      // Admins can read all offers
      allow read: if request.auth.token.admin == true;

      // Only admins can write
      allow create, update, delete: if request.auth.token.admin == true;
    }

    // NEW: Offline Payment Proofs
    match /offlinePaymentProofs/{proofId} {
      // Users can read their own payment proofs
      allow read: if request.auth.uid == resource.data.userId;

      // Users can create payment proofs
      allow create: if request.auth.uid == request.resource.data.userId
        && request.resource.data.status == 'pending';

      // Users can update to resubmit
      allow update: if request.auth.uid == resource.data.userId
        && request.resource.data.status == 'resubmitted';

      // Admins can read all
      allow read: if request.auth.token.admin == true;

      // Admins can update status
      allow update: if request.auth.token.admin == true;

      // No deletes (immutable audit trail)
      allow delete: if false;
    }

    // UPDATED: Orders (add payment field access)
    match /orders/{orderId} {
      // Users can read their own orders
      allow read: if request.auth.uid == resource.data.userId;

      // Users can create orders
      allow create: if request.auth.uid == request.resource.data.userId;

      // NEW: Users can update ONLY payment resubmission
      allow update: if request.auth.uid == resource.data.userId
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['paymentStatus', 'updatedAt']);

      // Admins can update all
      allow update: if request.auth.token.admin == true;
    }
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

## 4. Update Shared Types

Create new TypeScript interfaces in `shared/types/`:

**shared/types/payment.ts**:
```typescript
export type PaymentMethod = 'cod' | 'offline' | 'online';
export type PaymentStatus = 'pending' | 'verified' | 'collected' | 'failed';

export interface OfflinePaymentProof {
  id: string;
  orderId: string;
  userId: string;
  transactionId: string;
  transactionImageUrl: string;
  expectedAmount: number;
  uploadedAmount?: number;
  status: 'pending' | 'approved' | 'rejected' | 'resubmitted';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
  adminNotes?: string;
  imageValidated: boolean;
  imageSizeBytes: number;
  imageFormat: string;
  submissionAttempts: number;
  statusHistory: Array<{
    status: string;
    timestamp: Date;
    updatedBy?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
```

**shared/types/featuredOffer.ts**:
```typescript
export interface FeaturedOffer {
  id: string;
  title: string;
  description: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  thumbnailUrl?: string;
  videoDuration?: number;
  linkedOfferId?: string;
  linkedProductIds?: string[];
  displayOrder: number;
  backgroundColor?: string;
  ctaText: string;
  ctaAction: 'add_to_cart' | 'view_details' | 'external_link';
  status: 'draft' | 'active' | 'inactive';
  publishedAt?: Date;
  expiresAt?: Date;
  viewCount: number;
  addToCartCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

**Update shared/types/order.ts** (extend existing):
```typescript
// Add to existing Order interface
export interface Order {
  // ... existing fields from feature 001

  // NEW: Payment fields
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  codCollectedAmount?: number;
  codCollectedAt?: Date;
  codCollectedBy?: string;
  codNotes?: string;
  offlinePaymentProofId?: string;
}
```

## 5. Configure Mobile App

### Update app.json (Expo Config)

Add permissions for image picker and video playback:

```json
{
  "expo": {
    // ... existing config
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "The app needs access to your photos to upload payment receipts."
        }
      ],
      "expo-av"
    ],
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "The app needs camera access to capture payment receipts.",
        "NSPhotoLibraryUsageDescription": "The app needs photo library access to upload payment receipts."
      }
    },
    "android": {
      "permissions": [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "CAMERA"
      ]
    }
  }
}
```

### Rebuild Development Client (if using)

If using a custom development client (not Expo Go):
```bash
cd mobile
eas build --profile development --platform ios
eas build --profile development --platform android
```

## 6. Local Development Setup

### Start Firebase Emulators

```bash
firebase emulators:start
```

Emulators running:
- Firestore: http://localhost:8080
- Auth: http://localhost:9099
- Functions: http://localhost:5001
- Storage: http://localhost:9199

### Start Mobile App

```bash
cd mobile
npm start
```

### Start Admin Dashboard

```bash
cd admin
npm run dev
```

Admin dashboard: http://localhost:3000

## 7. Seed Test Data

### Create Test Featured Offer

Use Firebase Emulator UI (http://localhost:8080) or create via script:

```javascript
// Run in functions emulator or via Firebase CLI
const featuredOffer = {
  title: 'Test Featured Offer',
  description: 'Test description',
  mediaType: 'image',
  mediaUrl: 'https://via.placeholder.com/1080x1920/FF6B35/FFFFFF?text=Test+Offer',
  linkedProductIds: ['test_prod_1', 'test_prod_2'],
  displayOrder: 1,
  backgroundColor: '#FF6B35',
  ctaText: 'Add to Cart',
  ctaAction: 'add_to_cart',
  status: 'active',
  publishedAt: new Date(),
  viewCount: 0,
  addToCartCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'test_admin'
};

db.collection('featuredOffers').add(featuredOffer);
```

### Create Test Admin User

Ensure you have an admin user with custom claim:

```bash
firebase auth:export users.json --project your-project-id
# Edit users.json to add customClaims: { admin: true }
firebase auth:import users.json --project your-project-id
```

Or use Cloud Function to set admin claim:
```javascript
admin.auth().setCustomUserClaims(uid, { admin: true });
```

## 8. Test Key Workflows

### Test Featured Offers Carousel

1. Open mobile app
2. Should see featured offers slideshow on launch
3. Swipe between offers
4. Tap "Add to Cart" button
5. Verify offer is added to cart

### Test Offline Payment Flow

1. Add items to cart in mobile app
2. Go to checkout
3. Select "Offline Payment" method
4. Enter bank details (use test transaction ID: "TXN123456")
5. Upload a test image (use any JPG/PNG < 5MB)
6. Submit order
7. In admin dashboard, navigate to Payment Verification Queue
8. View the pending payment proof
9. Approve or reject the payment
10. Verify customer receives notification in mobile app

### Test COD Payment Flow

1. Add items to cart
2. Go to checkout
3. Select "Cash on Delivery"
4. Complete order
5. In admin dashboard, view COD orders
6. Mark payment as collected when "delivered"
7. Verify order completes

## 9. Deploy to Production

When ready to deploy:

### Deploy Cloud Functions

```bash
cd functions
npm run build
firebase deploy --only functions
```

### Deploy Firestore Rules and Indexes

```bash
firebase deploy --only firestore
```

### Deploy Storage Rules

```bash
firebase deploy --only storage
```

### Build and Deploy Mobile App

```bash
cd mobile
eas build --platform ios
eas build --platform android
eas submit --platform ios
eas submit --platform android
```

### Deploy Admin Dashboard

```bash
cd admin
npm run build
# Deploy to your hosting provider (Vercel, etc.)
vercel --prod
```

## 10. Monitoring and Debugging

### Check Cloud Function Logs

```bash
firebase functions:log
```

### Monitor Firestore Usage

Visit Firebase Console → Firestore → Usage tab

### Check Storage Usage

Visit Firebase Console → Storage → Usage tab

### Debug Mobile App

- Use Expo Dev Tools: Press `j` to open debugger
- View logs: `npx react-native log-ios` or `npx react-native log-android`

## Troubleshooting

### Issue: Image upload fails with "permission denied"

**Solution**: Verify Firebase Storage rules are deployed correctly:
```bash
firebase deploy --only storage
```

### Issue: Featured offers not appearing in mobile app

**Solution**:
1. Check Firestore security rules allow authenticated read
2. Verify offer status is 'active'
3. Check expiresAt is null or in future
4. Check network tab in mobile dev tools

### Issue: Payment verification doesn't update order status

**Solution**:
1. Check Cloud Function logs for errors
2. Verify Firestore triggers are deployed
3. Ensure admin user has proper claims
4. Check offlinePaymentProofId is correctly linked to order

### Issue: Video playback not working

**Solution**:
1. Verify video format is MP4 (H.264 codec)
2. Check video file size is under 20MB
3. Ensure video URL is accessible (CORS enabled)
4. Test on physical device (not just simulator)

## Next Steps

- Review [data-model.md](data-model.md) for complete schema details
- Check [contracts/](contracts/) for API specifications
- Run `/speckit.tasks` to generate implementation tasks
- Begin implementing components per tasks.md (generated by `/speckit.tasks`)

## Resources

- [Expo AV Documentation](https://docs.expo.dev/versions/latest/sdk/av/)
- [Expo Image Picker Documentation](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [Firebase Storage Security Rules](https://firebase.google.com/docs/storage/security)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
