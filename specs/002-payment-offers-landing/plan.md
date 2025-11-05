# Implementation Plan: Payment Options and Featured Offers Landing Page

**Branch**: `002-payment-offers-landing` | **Date**: 2025-11-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-payment-offers-landing/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Extends feature 001-grocery-store-app with two major capabilities: (1) alternative payment methods including Cash on Delivery (COD) and offline payment with transaction proof upload, and (2) a full-screen featured offers landing page with video/image slideshow. This feature adds payment flexibility for markets preferring non-digital payment methods while enhancing user engagement through immersive promotional content on app launch. Implementation extends existing Firebase architecture with new Firestore collections for payment proofs and featured offers, new Cloud Functions for payment verification, and enhanced Firebase Storage rules for transaction image uploads.

## Technical Context

**Dependency**: This feature EXTENDS [001-grocery-store-app](../001-grocery-store-app/plan.md) - inherits all technical stack decisions from feature 001.

**Language/Version**:
- Mobile: TypeScript with React Native (Expo SDK 50+)
- Admin Dashboard: TypeScript with Next.js 14+
- Cloud Functions: TypeScript/Node.js 18+

**Primary Dependencies**:
- **Mobile (NEW for feature 002)**:
  - expo-av - Video playback for featured offers
  - expo-image-picker - Transaction proof image upload
  - expo-file-system - File size validation
  - react-native-reanimated - Slideshow transitions
- **Mobile (from feature 001)**:
  - expo-notifications, expo-sms, @react-navigation/native, zustand, @tanstack/react-query, Firebase SDK
- **Admin (from feature 001)**:
  - Tailwind CSS, shadcn/ui, react-hook-form, Firebase Admin SDK
- **Backend (NEW for feature 002)**:
  - Sharp (Cloud Function) - Image validation and optimization for transaction proofs
  - Firebase Storage Rules - Transaction image access control
- **Backend (from feature 001)**:
  - Firebase (Firestore, Auth, Cloud Functions, Storage, FCM)

**Storage**:
- Firebase Firestore - Extended with new collections: `featuredOffers`, `offlinePaymentProofs`
- Firebase Storage - Extended with new bucket: `/transaction-proofs/{userId}/{orderId}/`

**Testing**: Jest + React Native Testing Library (mobile), Jest + React Testing Library (admin), Firebase Emulator Suite (backend)

**Target Platform**:
- Mobile: iOS 13+, Android 8.0+ (API level 26+)
- Admin: Modern browsers (Chrome, Firefox, Safari, Edge)
- Backend: Firebase Cloud Functions (Node.js 18 runtime)

**Project Type**: Mobile + Web (extends existing monorepo from feature 001)

**Performance Goals**:
- Featured offers slideshow: <2 seconds load time on app launch
- Video playback: Smooth 30fps playback on mid-range devices
- Transaction image upload: <10 seconds for 5MB images
- Payment verification: Admin can review/approve within 2 minutes
- Real-time sync: Featured offers updates visible in <500ms

**Constraints**:
- Image validation: Max 5MB for images (JPG/PNG), max 20MB for videos (MP4)
- Transaction proof images: Must validate format before upload
- Video autoplay: Muted by default for user experience
- Offline capability: Featured offers cached for offline viewing
- Payment verification: Admin must verify within 24 hours (SLA)

**Scale/Scope**:
- Featured offers: ~10-20 active offers simultaneously
- Transaction image storage: ~100-500 uploads/day
- Payment verification queue: ~50-200 pending verifications/day
- Video storage: ~500MB-1GB total for featured offer videos
- Mobile app: +5 new screens (featured offers carousel, payment selection, offline payment form, COD confirmation, admin payment review)
- Admin dashboard: +3 new pages (featured offers management, payment verification queue, COD orders list)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: PASS - Compliant with Jomla Project Constitution v1.0.0

**Compliance Review**:

- [x] **I. UI Component Standards**: Admin dashboard extends existing shadcn/ui usage for payment verification UI and featured offers management
- [x] **II. Mobile Development Best Practices**: React Native + Expo SDK 50+, uses expo-av for video, expo-image-picker for uploads, zustand for state, @tanstack/react-query for data fetching
- [x] **III. Cross-Platform Consistency**: Featured offers carousel and payment flows designed for both iOS and Android with platform-specific image picker behavior
- [x] **IV. Firebase-First Architecture**: Extends Firestore with new collections, uses Firebase Storage for transaction images, Cloud Functions for payment verification logic
- [x] **V. Type Safety**: TypeScript strict mode, new interfaces in `shared/types/payment.ts` and `shared/types/featuredOffer.ts`
- [x] **VI. Testing Requirements**: Jest + React Native Testing Library for mobile payment flows, Firebase Emulator Suite for payment verification functions

**Violations**: None

## Project Structure

### Documentation (this feature)

```text
specs/002-payment-offers-landing/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── payment-verification.yaml     # Cloud Function API for payment verification
│   ├── featured-offers-crud.yaml     # Admin API for featured offers management
│   └── payment-status-hooks.yaml     # Webhook definitions for payment status updates
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

**Note**: This feature EXTENDS the structure from feature 001. Only NEW or MODIFIED paths are shown below.

```text
mobile/                           # React Native Expo app (EXTENDED)
├── app/                          # Expo Router screens
│   ├── (tabs)/                   # Main tab navigation
│   │   └── index.tsx             # MODIFIED: Now featured offers landing page
│   ├── featured-offers/          # NEW: Featured offers carousel
│   │   └── [offerId].tsx
│   └── checkout/                 # EXTENDED: Payment method selection
│       ├── payment-method.tsx    # NEW: COD/Offline selection
│       ├── offline-payment.tsx   # NEW: Upload transaction proof
│       └── cod-confirmation.tsx  # NEW: COD order confirmation
├── src/
│   ├── components/               # Reusable UI components
│   │   ├── FeaturedOfferSlide.tsx    # NEW: Single featured offer slide
│   │   ├── FeaturedOffersCarousel.tsx # NEW: Slideshow component
│   │   ├── PaymentMethodSelector.tsx # NEW: Payment method selection
│   │   ├── TransactionProofUpload.tsx # NEW: Image upload component
│   │   └── VideoPlayer.tsx           # NEW: Auto-playing video component
│   ├── services/                 # Firebase service layer
│   │   ├── featuredOffers.ts     # NEW: Featured offers CRUD
│   │   ├── paymentProofs.ts      # NEW: Transaction proof upload
│   │   └── payments.ts           # NEW: Payment method handling
│   ├── hooks/                    # Custom React hooks
│   │   ├── useFeaturedOffers.ts  # NEW: Featured offers state
│   │   ├── useImageUpload.ts     # NEW: Image upload hook
│   │   └── useVideoPlayer.ts     # NEW: Video control hook
│   └── types/                    # TypeScript types
│       ├── payment.ts            # NEW: Payment types
│       └── featuredOffer.ts      # NEW: Featured offer types
└── __tests__/
    ├── components/
    │   ├── FeaturedOffersCarousel.test.tsx  # NEW
    │   └── TransactionProofUpload.test.tsx  # NEW
    └── services/
        ├── paymentProofs.test.ts            # NEW
        └── featuredOffers.test.ts           # NEW

admin/                            # Next.js admin dashboard (EXTENDED)
├── app/                          # Next.js App Router
│   └── (dashboard)/
│       ├── featured-offers/      # NEW: Featured offers management
│       │   ├── page.tsx
│       │   ├── new/
│       │   └── [id]/edit/
│       ├── payments/             # NEW: Payment verification
│       │   ├── verification-queue/
│       │   └── cod-orders/
│       └── orders/               # MODIFIED: Show payment method/status
├── components/
│   ├── dashboard/
│   │   ├── FeaturedOfferForm.tsx         # NEW: Create/edit featured offers
│   │   ├── PaymentProofViewer.tsx        # NEW: Review transaction images
│   │   ├── PaymentVerificationQueue.tsx  # NEW: Pending payments list
│   │   └── CODOrdersList.tsx             # NEW: COD orders management
│   └── ui/                       # shadcn/ui components (from feature 001)
└── __tests__/
    └── components/
        ├── FeaturedOfferForm.test.tsx    # NEW
        └── PaymentProofViewer.test.tsx   # NEW

functions/                        # Firebase Cloud Functions (EXTENDED)
├── src/
│   ├── payments/                 # NEW: Payment-related functions
│   │   ├── verifyOfflinePayment.ts   # Payment verification logic
│   │   ├── updatePaymentStatus.ts    # Status update handler
│   │   └── validateTransactionImage.ts  # Image validation
│   ├── featured-offers/          # NEW: Featured offers functions
│   │   ├── onOfferPublished.ts   # Trigger notification on publish
│   │   └── syncOfferCache.ts     # Cache management
│   └── orders/                   # EXTENDED: Handle new payment methods
│       └── createOrder.ts        # MODIFIED: Support COD/offline
└── __tests__/
    └── payments/
        ├── verifyOfflinePayment.test.ts  # NEW
        └── validateTransactionImage.test.ts  # NEW

firebase/                         # Firebase configuration (EXTENDED)
├── firestore.rules               # MODIFIED: Add rules for new collections
├── firestore.indexes.json        # MODIFIED: Indexes for payment queries
└── storage.rules                 # MODIFIED: Transaction image access rules

shared/                           # Shared types and utilities (EXTENDED)
└── types/                        # Common TypeScript interfaces
    ├── payment.ts                # NEW: Payment types
    ├── featuredOffer.ts          # NEW: Featured offer types
    └── order.ts                  # MODIFIED: Add payment fields
```

**Structure Decision**: Extends the monorepo structure from feature 001 with new directories for payment and featured offers functionality. Mobile app gains new screens for payment selection and featured offers carousel. Admin dashboard adds featured offers management and payment verification pages. Cloud Functions extend with payment verification logic. Maintains separation of concerns while building on existing architecture.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No constitution violations to justify.
