# Tasks: Payment Options and Featured Offers Landing Page

**Feature Branch**: `002-payment-offers-landing`
**Input**: Design documents from `/specs/002-payment-offers-landing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Base Feature**: This feature EXTENDS [001-grocery-store-app](../001-grocery-store-app/tasks.md)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependencies and configure project for feature 002

**Prerequisites**: Feature 001 must be fully set up and working

- [ ] T001 Install mobile dependencies: expo-av, expo-image-picker, expo-file-system, react-native-reanimated in mobile/package.json
- [ ] T002 Install Cloud Functions dependency: sharp in functions/package.json
- [ ] T003 [P] Update mobile/app.json with expo-image-picker and expo-av plugin configurations and permissions
- [ ] T004 [P] Create shared/types/payment.ts with PaymentMethod, PaymentStatus, and OfflinePaymentProof interfaces
- [ ] T005 [P] Create shared/types/featuredOffer.ts with FeaturedOffer interface
- [ ] T006 [P] Update shared/types/order.ts to extend Order interface with payment fields (paymentMethod, paymentStatus, COD fields, offlinePaymentProofId)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Firestore Schema & Security

- [ ] T007 Update firebase/firestore.rules to add featuredOffers collection rules (active offers readable by authenticated users, admin-only write)
- [ ] T008 Update firebase/firestore.rules to add offlinePaymentProofs collection rules (user-scoped read/write, admin read-all, no deletes)
- [ ] T009 Update firebase/firestore.rules to extend orders collection rules (allow users to update paymentStatus field for resubmission)
- [ ] T010 Update firebase/firestore.indexes.json to add orders indexes (paymentMethod + paymentStatus + createdAt, paymentStatus + createdAt)
- [ ] T011 Update firebase/firestore.indexes.json to add featuredOffers indexes (status + displayOrder, status + expiresAt)
- [ ] T012 Update firebase/firestore.indexes.json to add offlinePaymentProofs indexes (status + submittedAt, userId + submittedAt, orderId + status)

### Firebase Storage Security

- [ ] T013 Update firebase/storage.rules to add transaction-proofs path rules (user-scoped upload to own directory, 5MB limit, JPG/PNG only, immutable)
- [ ] T014 Update firebase/storage.rules to add featured-offers path rules (admin-only write, authenticated read, 5MB images/20MB videos)

### Deploy Firebase Configuration

- [ ] T015 Deploy Firestore security rules and indexes: firebase deploy --only firestore
- [ ] T016 Deploy Firebase Storage rules: firebase deploy --only storage

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Featured Offers Landing Page (Priority: P1) 🎯 MVP

**Goal**: Display full-screen featured offers slideshow on app launch with video/image support and "Add to Cart" functionality

**Independent Test**: Open mobile app, view slideshow of offers (images/videos), swipe between offers, tap "Add to Cart" buttons. Delivers immediate value by showcasing promotions without requiring any other feature.

### Mobile Components for User Story 1

- [ ] T017 [P] [US1] Create mobile/src/components/VideoPlayer.tsx component with expo-av for auto-playing looping video (muted by default)
- [ ] T018 [P] [US1] Create mobile/src/components/FeaturedOfferSlide.tsx component to display single offer (image or video with CTA overlay)
- [ ] T019 [US1] Create mobile/src/components/FeaturedOffersCarousel.tsx with react-native-reanimated for swipeable full-screen slideshow (depends on T017, T018)
- [ ] T020 [US1] Add pagination dots and close button to FeaturedOffersCarousel.tsx

### Mobile Services for User Story 1

- [ ] T021 [P] [US1] Create mobile/src/services/featuredOffers.ts with fetchActiveFeaturedOffers() function (Firestore query: status=active, order by displayOrder)
- [ ] T022 [P] [US1] Create mobile/src/hooks/useFeaturedOffers.ts with @tanstack/react-query to fetch and cache featured offers
- [ ] T023 [P] [US1] Create mobile/src/hooks/useVideoPlayer.ts for video playback state management (play/pause based on slide visibility)

### Mobile Integration for User Story 1

- [ ] T024 [US1] Update mobile/app/(tabs)/index.tsx to render FeaturedOffersCarousel when active offers exist, otherwise show regular home page
- [ ] T025 [US1] Implement "Add to Cart" button handler in FeaturedOfferSlide.tsx to add linked products to cart and show confirmation
- [ ] T026 [US1] Add analytics tracking in featuredOffers.ts to increment viewCount and addToCartCount using FieldValue.increment()
- [ ] T027 [US1] Implement offline caching for featured offers in useFeaturedOffers.ts using AsyncStorage for offline viewing

**Checkpoint**: At this point, customers can view featured offers carousel on app launch and add offers to cart. US1 is fully functional and testable independently.

---

## Phase 4: User Story 4 - Admin Featured Offers Management (Priority: P2)

**Goal**: Enable admins to create, edit, and manage featured offers with rich media (images or videos)

**Independent Test**: Log into admin dashboard, create a new featured offer with media upload, set display order, publish it, and verify it appears in mobile app. Delivers standalone admin capability.

**Note**: This is sequenced as Phase 4 (before US2 and US3) because it enables the P1 customer-facing feature and has no dependencies on payment features.

### Admin Components for User Story 4

- [ ] T028 [P] [US4] Create admin/components/dashboard/FeaturedOfferForm.tsx with react-hook-form for create/edit form (title, description, media upload, linkedOfferId, linkedProductIds, displayOrder, status, expiration)
- [ ] T029 [P] [US4] Create admin/components/dashboard/FeaturedOffersList.tsx to display table of all featured offers with status, media thumbnails, display order, and action buttons
- [ ] T030 [P] [US4] Create admin/components/dashboard/FeaturedOfferPreview.tsx modal to preview how offer appears in mobile app

### Admin Pages for User Story 4

- [ ] T031 [US4] Create admin/app/(dashboard)/featured-offers/page.tsx to render FeaturedOffersList with filters (status, expiration) and "Create New" button
- [ ] T032 [US4] Create admin/app/(dashboard)/featured-offers/new/page.tsx to render FeaturedOfferForm for creating new offers
- [ ] T033 [US4] Create admin/app/(dashboard)/featured-offers/[id]/edit/page.tsx to render FeaturedOfferForm for editing existing offers

### Cloud Functions for User Story 4

- [ ] T034 [P] [US4] Create functions/src/featured-offers/onOfferPublished.ts Firestore trigger (featuredOffers onUpdate, status changes to 'active') to send push notification to all users
- [ ] T035 [P] [US4] Create functions/src/featured-offers/syncOfferCache.ts Firestore trigger (featuredOffers onUpdate/onCreate) to invalidate mobile app cache

### Admin Services for User Story 4

- [ ] T036 [US4] Implement media upload handler in FeaturedOfferForm.tsx to upload images/videos to Firebase Storage (/featured-offers/{offerId}/) with validation (5MB images, 20MB videos)
- [ ] T037 [US4] Implement CRUD operations in FeaturedOfferForm.tsx: createFeaturedOffer(), updateFeaturedOffer(), deleteFeaturedOffer() with Firestore Admin SDK
- [ ] T038 [US4] Add display order conflict detection in FeaturedOfferForm.tsx to warn if another offer has same displayOrder
- [ ] T039 [US4] Implement publish/unpublish toggle in FeaturedOffersList.tsx to change status between 'active' and 'inactive'

**Checkpoint**: Admins can fully manage featured offers. Combined with US1, the featured offers system is complete.

---

## Phase 5: User Story 2 - Cash on Delivery Payment Option (Priority: P2)

**Goal**: Allow customers to select "Cash on Delivery" as payment method during checkout

**Independent Test**: Proceed through checkout, select "Cash on Delivery" option, complete order, verify order is marked for COD payment. Delivers standalone value for customers who prefer cash payments.

### Mobile Components for User Story 2

- [ ] T040 [P] [US2] Create mobile/src/components/PaymentMethodSelector.tsx to display payment options (Online, COD, Offline) with descriptions and selection state
- [ ] T041 [P] [US2] Create mobile/app/checkout/payment-method.tsx screen to render PaymentMethodSelector and handle selection

### Mobile Services for User Story 2

- [ ] T042 [US2] Create mobile/src/services/payments.ts with submitCODOrder() function to create order with paymentMethod='cod' and paymentStatus='pending'
- [ ] T043 [US2] Update mobile/app/checkout/payment-method.tsx to integrate submitCODOrder() and navigate to COD confirmation screen

### Mobile Integration for User Story 2

- [ ] T044 [US2] Create mobile/app/checkout/cod-confirmation.tsx screen to show COD order confirmation with payment instructions (pay driver on delivery)
- [ ] T045 [US2] Update mobile order confirmation notifications to display COD payment method and instructions

### Cloud Functions for User Story 2

- [ ] T046 [US2] Update functions/src/orders/createOrder.ts to handle paymentMethod='cod': set paymentStatus='pending', validate order, send COD-specific confirmation email
- [ ] T047 [US2] Create functions/src/payments/updatePaymentStatus.ts Cloud Function (HTTP) for driver/admin to mark COD payment as 'collected' with collectedAmount and timestamp

### Admin Components for User Story 2

- [ ] T048 [P] [US2] Create admin/components/dashboard/CODOrdersList.tsx to display table of COD orders with filters (payment status: pending/collected)
- [ ] T049 [US2] Create admin/app/(dashboard)/payments/cod-orders/page.tsx to render CODOrdersList with "Mark as Collected" action buttons

### Admin Integration for User Story 2

- [ ] T050 [US2] Update admin/app/(dashboard)/orders/[id]/page.tsx to display payment method and COD-specific fields (collectedAmount, collectedAt, collectedBy)
- [ ] T051 [US2] Implement "Mark Payment Collected" button in order detail page to call updatePaymentStatus Cloud Function and update order status to 'completed'

**Checkpoint**: Customers can place COD orders and admins can track COD payment collection. US2 is fully functional and testable independently.

---

## Phase 6: User Story 3 - Offline Payment with Proof Upload (Priority: P3)

**Goal**: Allow customers to upload transaction proof (image + transaction ID) for offline payments (bank transfer/mobile payment)

**Independent Test**: Select "Offline Payment" at checkout, upload transaction image, enter transaction ID, submit order, verify admin receives payment proof for review. Delivers value independently for customers using external payment methods.

### Mobile Components for User Story 3

- [ ] T052 [P] [US3] Create mobile/src/components/TransactionProofUpload.tsx with expo-image-picker to select image from gallery, display preview, and show upload progress
- [ ] T053 [P] [US3] Create mobile/src/hooks/useImageUpload.ts to handle image selection, client-side validation (format, 5MB size limit), and Firebase Storage upload

### Mobile Services for User Story 3

- [ ] T054 [US3] Create mobile/src/services/paymentProofs.ts with uploadTransactionProof(orderId, transactionId, imageUri) to upload image to Storage and create offlinePaymentProofs document
- [ ] T055 [US3] Extend mobile/src/services/payments.ts with submitOfflinePaymentOrder() to create order with paymentMethod='offline', paymentStatus='pending', link to offlinePaymentProofId

### Mobile Screens for User Story 3

- [ ] T056 [US3] Create mobile/app/checkout/offline-payment.tsx screen to display bank account details, TransactionProofUpload component, transaction ID input field, and submit button
- [ ] T057 [US3] Update mobile/app/checkout/payment-method.tsx to navigate to offline-payment.tsx when "Offline Payment" is selected
- [ ] T058 [US3] Implement order submission in offline-payment.tsx: call uploadTransactionProof(), then submitOfflinePaymentOrder(), show "Pending Verification" confirmation
- [ ] T059 [US3] Add resubmission flow in mobile order details to allow users to upload new proof if payment was rejected

### Cloud Functions for User Story 3

- [ ] T060 [US3] Create functions/src/payments/validateTransactionImage.ts Storage trigger (transaction-proofs finalize) to validate image format with Sharp, resize to max 1920x1920, optimize JPEG quality, delete invalid images
- [ ] T061 [US3] Create functions/src/payments/verifyOfflinePayment.ts HTTP Cloud Function (admin-only) to approve/reject payment proof: update offlinePaymentProofs status, update linked order paymentStatus, send customer notification
- [ ] T062 [US3] Create functions/src/payments/onPaymentProofStatusChange.ts Firestore trigger (offlinePaymentProofs onUpdate) to handle status changes: if approved → update order to 'confirmed', if rejected → send rejection notification with reason

### Admin Components for User Story 3

- [ ] T063 [P] [US3] Create admin/components/dashboard/PaymentProofViewer.tsx to display transaction image with zoom/pan controls, transaction details, order info, and approve/reject buttons
- [ ] T064 [P] [US3] Create admin/components/dashboard/PaymentVerificationQueue.tsx to display table of pending payment proofs sorted by submittedAt with "Review" action buttons

### Admin Pages for User Story 3

- [ ] T065 [US3] Create admin/app/(dashboard)/payments/verification-queue/page.tsx to render PaymentVerificationQueue with filters (status: pending/approved/rejected)
- [ ] T066 [US3] Create admin/app/(dashboard)/payments/verification-queue/[proofId]/page.tsx to render PaymentProofViewer for detailed review with full-screen image, approve/reject form (with optional notes/rejection reason)

### Admin Integration for User Story 3

- [ ] T067 [US3] Implement approve/reject handlers in PaymentProofViewer.tsx to call verifyOfflinePayment Cloud Function with action='approve' or action='reject' and rejectionReason
- [ ] T068 [US3] Update admin/app/(dashboard)/orders/[id]/page.tsx to display offlinePaymentProofId link to verification page if paymentMethod='offline'
- [ ] T069 [US3] Add SLA monitoring: create functions/src/payments/onPaymentVerificationTimeout.ts scheduled Cloud Function (runs hourly) to query proofs pending > 24 hours and send admin email/Slack notification

**Checkpoint**: Customers can upload payment proofs, admins can verify submissions, and the system automates order status updates. US3 is fully functional and testable independently.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Testing

- [ ] T070 [P] Create mobile/__tests__/components/FeaturedOffersCarousel.test.tsx with React Native Testing Library to test slideshow navigation and CTA buttons
- [ ] T071 [P] Create mobile/__tests__/components/TransactionProofUpload.test.tsx to test image selection, validation, and upload flow
- [ ] T072 [P] Create mobile/__tests__/services/paymentProofs.test.ts to test uploadTransactionProof() with Firebase Emulator
- [ ] T073 [P] Create mobile/__tests__/services/featuredOffers.test.ts to test fetchActiveFeaturedOffers() with Firebase Emulator
- [ ] T074 [P] Create admin/__tests__/components/FeaturedOfferForm.test.tsx with React Testing Library to test form validation and submission
- [ ] T075 [P] Create admin/__tests__/components/PaymentProofViewer.test.tsx to test approve/reject actions
- [ ] T076 [P] Create functions/__tests__/payments/verifyOfflinePayment.test.ts to test approval/rejection logic with Firebase Emulator
- [ ] T077 [P] Create functions/__tests__/payments/validateTransactionImage.test.ts to test image validation with Sharp and mock Storage

### Documentation & Validation

- [ ] T078 [P] Update CLAUDE.md with new technologies (expo-av, expo-image-picker, expo-file-system, react-native-reanimated, Sharp)
- [ ] T079 [P] Add featured offers management section to admin dashboard documentation
- [ ] T080 Run through quickstart.md setup validation for feature 002: install dependencies, configure Firebase rules/indexes, seed test data, verify mobile app and admin dashboard
- [ ] T081 Create seed script for test featured offers in functions/src/utils/seedFeaturedOffers.ts for local development

### Performance & Security

- [ ] T082 Implement featured offers caching strategy: mobile app caches offers in AsyncStorage, refreshes every 5 minutes or on app foreground
- [ ] T083 Add rate limiting to verifyOfflinePayment Cloud Function to prevent abuse (max 10 verifications per minute per admin)
- [ ] T084 Optimize transaction image loading in PaymentProofViewer.tsx: load thumbnail first, then full resolution on zoom
- [ ] T085 Add error handling for video playback failures in VideoPlayer.tsx: fallback to poster image if video fails to load
- [ ] T086 Implement retry logic for failed transaction image uploads in useImageUpload.ts with exponential backoff

### Monitoring & Analytics

- [ ] T087 Add Firebase Analytics events for featured offers: offer_viewed, offer_add_to_cart, offer_swiped
- [ ] T088 Add Firebase Analytics events for payment flows: payment_method_selected, cod_order_placed, offline_payment_submitted, payment_verified
- [ ] T089 Create admin analytics dashboard component to display featured offers conversion rates (viewCount → addToCartCount)
- [ ] T090 Add logging to payment verification workflow: log all approve/reject actions with admin ID, timestamp, and reason for audit trail

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately after feature 001 is complete
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - US1 (Featured Offers - Phase 3): Can start after Foundational
  - US4 (Admin Featured Offers - Phase 4): Can start after Foundational (enables US1)
  - US2 (COD Payment - Phase 5): Can start after Foundational (independent of US1/US4)
  - US3 (Offline Payment - Phase 6): Can start after Foundational (independent of US1/US2/US4)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (Featured Offers - P1)**: No dependencies on other stories. Can be implemented and tested independently.
- **User Story 4 (Admin Featured Offers - P2)**: No dependencies on other stories. Enables US1 functionality. Can be implemented and tested independently.
- **User Story 2 (COD Payment - P2)**: No dependencies on other stories. Independent payment method. Can be implemented and tested independently.
- **User Story 3 (Offline Payment - P3)**: No dependencies on other stories. Independent payment method. Can be implemented and tested independently.

**Independence**: All user stories are designed to be independently completable. They extend the order system and app landing page without interdependencies.

### Within Each User Story

**User Story 1 (Featured Offers)**:
1. Components first (T017, T018 can be parallel) → T019 depends on both
2. Services (T021, T022, T023 all parallel)
3. Integration (T024-T027 sequential)

**User Story 4 (Admin Featured Offers)**:
1. Components (T028, T029, T030 all parallel)
2. Pages (T031-T033 sequential, each uses components)
3. Cloud Functions (T034, T035 parallel)
4. Services (T036-T039 sequential, build on components/functions)

**User Story 2 (COD Payment)**:
1. Mobile components (T040, T041 parallel)
2. Mobile services (T042-T045 sequential)
3. Cloud Functions (T046, T047 parallel)
4. Admin components (T048 parallel with T049 sequential after)
5. Admin integration (T050-T051 sequential)

**User Story 3 (Offline Payment)**:
1. Mobile components (T052, T053 parallel)
2. Mobile services (T054-T055 sequential)
3. Mobile screens (T056-T059 sequential)
4. Cloud Functions (T060-T062 sequential due to dependencies)
5. Admin components (T063, T064 parallel)
6. Admin pages (T065-T066 sequential)
7. Admin integration (T067-T069 sequential)

### Parallel Opportunities

**Setup Phase**: T003, T004, T005, T006 can all run in parallel

**User Story 1**: T017+T018, T021+T022+T023 can run in parallel within their groups

**User Story 4**: T028+T029+T030, T034+T035, T048 can run in parallel within their groups

**User Story 2**: T040+T041, T046+T047 can run in parallel within their groups

**User Story 3**: T052+T053, T063+T064 can run in parallel within their groups

**Polish Phase**: T070-T077 (all tests), T078-T079 (docs) can all run in parallel

**Cross-Story Parallelism**: Once Phase 2 is complete, US1+US4+US2+US3 can all be worked on in parallel by different team members.

---

## Parallel Example: Multiple User Stories

```bash
# After Foundational phase completes, launch multiple user stories in parallel:

# Team Member A works on User Story 1 (Featured Offers):
Task: T017 - VideoPlayer component
Task: T018 - FeaturedOfferSlide component
Task: T019 - FeaturedOffersCarousel component
# ... continue through US1

# Team Member B works on User Story 4 (Admin Featured Offers):
Task: T028 - FeaturedOfferForm component
Task: T029 - FeaturedOffersList component
# ... continue through US4

# Team Member C works on User Story 2 (COD Payment):
Task: T040 - PaymentMethodSelector component
Task: T042 - payments service
# ... continue through US2

# Team Member D works on User Story 3 (Offline Payment):
Task: T052 - TransactionProofUpload component
Task: T054 - paymentProofs service
# ... continue through US3
```

---

## Parallel Example: User Story 1 (Featured Offers)

```bash
# Launch all parallel components for User Story 1 together:
Task: T017 - "Create VideoPlayer.tsx component"
Task: T018 - "Create FeaturedOfferSlide.tsx component"

# Then launch all parallel services together:
Task: T021 - "Create featuredOffers.ts service"
Task: T022 - "Create useFeaturedOffers.ts hook"
Task: T023 - "Create useVideoPlayer.ts hook"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 4)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Featured Offers Landing Page)
4. Complete Phase 4: User Story 4 (Admin Featured Offers Management)
5. **STOP and VALIDATE**: Test US1+US4 together - admins can create offers, customers see them in mobile app
6. Deploy/demo the featured offers system

**Why this MVP**: US1+US4 together form a complete, high-impact feature (featured offers landing page with admin management). Delivers immediate engagement value without requiring payment changes.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 + US4 → Featured Offers System Complete → Deploy/Demo (MVP!)
3. Add US2 → Cash on Delivery Available → Deploy/Demo
4. Add US3 → Offline Payment Available → Deploy/Demo
5. Add Phase 7 → Polish & Testing → Final Deploy

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (critical blocking work)
2. Once Foundational is done (after T016):
   - Developer A: User Story 1 (Featured Offers - Mobile)
   - Developer B: User Story 4 (Admin Featured Offers)
   - Developer C: User Story 2 (COD Payment)
   - Developer D: User Story 3 (Offline Payment)
3. Stories complete and integrate independently
4. Team reconvenes for Phase 7 (Polish)

---

## Notes

- [P] tasks = different files, no dependencies within their group
- [Story] label maps task to specific user story (US1, US2, US3, US4) for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Feature 001 must be fully working before starting feature 002
- All Firebase configuration changes (rules, indexes) must be deployed before implementing user stories
- Transaction images are immutable (audit trail) - no user updates/deletes allowed
- Featured offers use FieldValue.increment() for atomic analytics updates
- Payment verification has 24-hour SLA enforced by scheduled Cloud Function
