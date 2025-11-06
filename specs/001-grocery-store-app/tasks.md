# Tasks: Grocery Store Mobile App with Admin Dashboard

**Input**: Design documents from `/specs/001-grocery-store-app/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the feature specification, so test tasks are excluded from this implementation plan.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This project uses a monorepo structure:
- **Mobile**: `mobile/` (React Native Expo app)
- **Admin**: `admin/` (Next.js admin dashboard)
- **Functions**: `functions/` (Firebase Cloud Functions)
- **Shared**: `shared/` (Common TypeScript types)
- **Firebase**: `firebase/` (Firestore rules, indexes, config)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Initialize monorepo structure with mobile/, admin/, functions/, shared/, and firebase/ directories
- [X] T002 [P] Initialize Expo mobile app in mobile/ with TypeScript template (SDK 50+)
- [X] T003 [P] Initialize Next.js 14+ app in admin/ with TypeScript and App Router
- [X] T004 [P] Initialize Firebase Cloud Functions in functions/ with TypeScript
- [X] T005 [P] Create shared TypeScript types directory in shared/types/
- [X] T006 Configure Firebase project and initialize Firestore, Auth, Storage, Functions
- [X] T007 [P] Install mobile dependencies: expo-notifications, expo-sms, @react-navigation/native, zustand, @tanstack/react-query, Firebase SDK
- [X] T008 [P] Install admin dependencies: Tailwind CSS, shadcn/ui, react-hook-form, Firebase Admin SDK
- [X] T009 [P] Install functions dependencies: Firebase Admin SDK, Twilio SDK
- [X] T010 [P] Setup environment configuration files: mobile/.env, admin/.env.local, functions/.env
- [X] T011 [P] Configure ESLint and Prettier for mobile/, admin/, and functions/
- [X] T012 Setup Firebase emulator configuration in firebase.json for local development

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T013 Define shared TypeScript interfaces in shared/types/user.ts
- [X] T014 [P] Define shared TypeScript interfaces in shared/types/product.ts
- [X] T015 [P] Define shared TypeScript interfaces in shared/types/offer.ts
- [X] T016 [P] Define shared TypeScript interfaces in shared/types/cart.ts
- [X] T017 [P] Define shared TypeScript interfaces in shared/types/order.ts
- [X] T018 [P] Define shared TypeScript interfaces in shared/types/notification.ts
- [X] T019 Implement Firestore security rules in firebase/firestore.rules based on contracts/firestore-rules.md
- [X] T020 [P] Configure Firestore indexes in firebase/firestore.indexes.json for products, offers, orders, and notifications queries
- [X] T021 [P] Configure Firebase Storage security rules in firebase/storage.rules
- [X] T022 Initialize Firebase SDK in mobile app at mobile/src/services/firebase.ts with emulator detection
- [X] T023 [P] Initialize Firebase Admin SDK in admin dashboard at admin/lib/firebase-admin.ts
- [X] T024 [P] Initialize Firebase Admin SDK in Cloud Functions at functions/src/config/firebase-admin.ts
- [X] T025 Setup Zustand store structure in mobile/src/store/index.ts for cart and auth state
- [X] T026 [P] Setup React Query configuration in mobile/src/services/query-client.ts
- [X] T027 [P] Configure Expo Router structure in mobile/app/ with (auth), (tabs), and orders directories
- [X] T028 [P] Configure Next.js App Router structure in admin/app/ with (auth) and (dashboard) groups
- [X] T029 Implement base error handling utility in functions/src/utils/errors.ts with standard error codes
- [X] T030 [P] Implement Firebase auth helper functions in mobile/src/services/auth.ts
- [X] T031 [P] Implement admin authentication middleware in admin/middleware.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel ✅ COMPLETE

---

## Phase 3: User Story 1 - User Registration and Account Management (Priority: P1) 🎯 MVP

**Goal**: Enable new customers to create accounts, verify via SMS, login with email/password, and reset passwords

**Independent Test**: Register a new user with mobile number, email, name and password, verify via SMS code, login with email/password, test password recovery via SMS

### Implementation for User Story 1

- [X] T032 [P] [US1] Implement sendVerificationCode Cloud Function in functions/src/auth/sendVerificationCode.ts
- [X] T033 [P] [US1] Implement verifyCode Cloud Function in functions/src/auth/verifyCode.ts
- [X] T034 [P] [US1] Implement resetPassword Cloud Function in functions/src/auth/resetPassword.ts
- [X] T035 [P] [US1] Create User Firestore service in mobile/src/services/userService.ts for user CRUD operations
- [X] T036 [US1] Create registration screen at mobile/app/(auth)/register.tsx with form validation (8+ char password, email, phone)
- [X] T037 [US1] Create phone verification screen at mobile/app/(auth)/verify-phone.tsx with 6-digit code input and resend logic (max 3 attempts/hour)
- [X] T038 [US1] Create login screen at mobile/app/(auth)/login.tsx with email/password form
- [X] T039 [US1] Create forgot password screen at mobile/app/(auth)/forgot-password.tsx with phone verification flow
- [X] T040 [US1] Implement session management with 30-day sliding expiration in mobile/src/services/sessionService.ts
- [X] T041 [US1] Add authentication state management to Zustand store in mobile/src/store/index.ts
- [X] T042 [US1] Implement auth redirect logic in mobile/app/_layout.tsx to protect authenticated routes
- [X] T043 [US1] Create password reset confirmation screen at mobile/app/(auth)/reset-password.tsx
- [X] T044 [US1] Add error handling for verification failures (expired codes, rate limits) in mobile/src/utils/authErrors.ts
- [X] T045 [US1] Implement FCM token registration on login in mobile/src/services/notificationService.ts

**Checkpoint**: User registration, SMS verification, login, and password reset should be fully functional ✅ COMPLETE

---

## Phase 4: User Story 2 - Browse and View Product Offers (Priority: P1)

**Goal**: Enable customers to browse bundled offers with clear discount pricing and product breakdowns

**Independent Test**: Create product bundles in admin dashboard, view them in mobile app with discounted and original totals displayed

### Implementation for User Story 2

- [X] T046 [P] [US2] Create Offer Firestore service in mobile/src/services/offerService.ts for querying active offers
- [X] T047 [P] [US2] Create Product Firestore service in mobile/src/services/productService.ts for querying products
- [X] T048 [US2] Create offers list screen at mobile/app/(tabs)/index.tsx showing active offers with pricing
- [X] T049 [P] [US2] Create OfferCard component in mobile/src/components/OfferCard.tsx displaying savings and totals
- [X] T050 [P] [US2] Create offer details screen at mobile/app/offers/[offerId].tsx showing product breakdown
- [X] T051 [US2] Implement React Query hooks for offers in mobile/src/hooks/useOffers.ts with caching
- [X] T052 [P] [US2] Implement React Query hooks for products in mobile/src/hooks/useProducts.ts with caching
- [X] T053 [US2] Create products list screen at mobile/app/(tabs)/products.tsx showing individual products
- [X] T054 [P] [US2] Create ProductCard component in mobile/src/components/ProductCard.tsx with image and price
- [X] T055 [US2] Add real-time listener for offer updates in mobile/src/services/offerService.ts
- [X] T056 [US2] Implement offline caching for offers and products using React Query persistence
- [X] T057 [US2] Display quantity limits (min/max) on offer and product cards

**Checkpoint**: Users should be able to browse active offers and products with clear pricing information ✅ COMPLETE

---

## Phase 5: User Story 3 - Add Items to Cart with Mixed Content (Priority: P1)

**Goal**: Enable customers to add multiple offers and individual products to cart with quantity validation

**Independent Test**: Add multiple offers to cart, add individual products, verify cart totals calculate correctly including all discounts and quantity limits are enforced

### Implementation for User Story 3

- [X] T058 [P] [US3] Create Cart Firestore service in mobile/src/services/cartService.ts for cart CRUD operations
- [X] T059 [US3] Implement cart state management in Zustand store at mobile/src/store/cartStore.ts with offline persistence
- [X] T060 [P] [US3] Create cart validation utility in mobile/src/utils/cartValidation.ts for quantity limits
- [X] T061 [US3] Add "Add to Cart" functionality to OfferCard component with quantity controls
- [X] T062 [P] [US3] Add "Add to Cart" functionality to ProductCard component with quantity controls
- [X] T063 [US3] Create cart screen at mobile/app/(tabs)/cart.tsx displaying offers and products separately
- [X] T064 [P] [US3] Create CartOfferItem component in mobile/src/components/cart/CartOfferItem.tsx showing bundled products
- [X] T065 [P] [US3] Create CartProductItem component in mobile/src/components/cart/CartProductItem.tsx showing individual items
- [X] T066 [US3] Implement cart total calculations in mobile/src/utils/cartCalculations.ts (subtotal, savings, total)
- [X] T067 [US3] Add quantity limit alerts using native alerts when min/max exceeded
- [X] T068 [US3] Implement cart invalidation detection in mobile/src/services/cartService.ts for modified offers
- [X] T069 [US3] Display warning banner on cart screen when offers have changed/been removed
- [X] T070 [US3] Add remove item functionality for cart items
- [X] T071 [US3] Implement AsyncStorage sync for offline cart management in mobile/src/store/cartStore.ts
- [X] T072 [US3] Implement validateCart Cloud Function in functions/src/cart/validateCart.ts for server-side validation

**Checkpoint**: Users should be able to add mixed items to cart with full validation and offline support ✅ COMPLETE

---

## Phase 6: User Story 4 - Place Order with Delivery or Pickup Options (Priority: P1)

**Goal**: Enable customers to complete checkout with delivery or pickup options and receive detailed invoices

**Independent Test**: Place an order with delivery option, place another order with pickup option, verify both workflows complete successfully with invoices generated

### Implementation for User Story 4

- [X] T073 [P] [US4] Create Order Firestore service in mobile/src/services/orderService.ts for order CRUD operations
- [X] T074 [US4] Implement createOrder Cloud Function in functions/src/orders/createOrder.ts with full cart validation
- [X] T075 [P] [US4] Implement generateInvoice Cloud Function in functions/src/orders/generateInvoice.ts using pdfkit
- [X] T076 [US4] Create checkout screen at mobile/app/checkout/index.tsx with fulfillment method selection
- [X] T077 [P] [US4] Create delivery details form component in mobile/src/components/checkout/DeliveryForm.tsx
- [X] T078 [P] [US4] Create pickup details form component in mobile/src/components/checkout/PickupForm.tsx
- [X] T079 [US4] Create order confirmation screen at mobile/app/orders/[orderId].tsx showing invoice details
- [X] T080 [US4] Implement order submission logic in mobile/src/services/orderService.ts with error handling
- [X] T081 [US4] Create order history screen at mobile/app/orders/index.tsx listing user's orders
- [X] T082 [P] [US4] Create OrderCard component in mobile/src/components/orders/OrderCard.tsx with status display
- [X] T083 [US4] Implement invoice PDF generation template in functions/src/orders/invoiceTemplate.ts with offer product breakdown
- [X] T084 [US4] Upload generated invoices to Firebase Storage in functions/src/orders/generateInvoice.ts
- [X] T085 [US4] Add invoice download/view functionality in order details screen
- [X] T086 [US4] Clear cart after successful order placement
- [X] T087 [US4] Display delivery fee calculation for delivery orders
- [X] T088 [US4] Implement order number generation (ORD-YYYYMMDD-####) in functions/src/utils/orderNumber.ts

**Checkpoint**: Users should be able to complete full checkout flow with delivery or pickup and receive invoices ✅ COMPLETE

---

## Phase 7: User Story 5 - Receive Order and Offer Notifications (Priority: P2)

**Goal**: Enable customers to receive push notifications about new offers and order status updates

**Independent Test**: Create a new offer in admin dashboard and verify notification is sent to mobile app users, change order status and verify tracking notifications are sent

### Implementation for User Story 5

- [X] T089 [P] [US5] Configure expo-notifications in mobile/app.json with FCM credentials
- [X] T090 [P] [US5] Implement push notification permissions request in mobile/src/services/notificationService.ts
- [X] T091 [US5] Implement sendOfferNotification Cloud Function in functions/src/notifications/sendOfferNotification.ts
- [X] T092 [P] [US5] Implement sendOrderStatusNotification Cloud Function in functions/src/notifications/sendOrderStatusNotification.ts
- [X] T093 [US5] Setup notification listeners in mobile/app/_layout.tsx for foreground notifications
- [X] T094 [US5] Implement deep linking for notification taps in mobile/app.json and mobile/app/_layout.tsx
- [X] T095 [P] [US5] Create notification handler utility in mobile/src/utils/notificationHandler.ts for routing
- [X] T096 [US5] Add FCM token refresh logic in mobile/src/services/notificationService.ts
- [X] T097 [US5] Store notification history in Firestore notifications collection via Cloud Functions
- [X] T098 [US5] Handle notification tap to open offer details screen
- [X] T099 [US5] Handle notification tap to open order tracking screen
- [X] T100 [US5] Implement silent notifications for cart invalidation warnings
- [X] T101 [US5] Add notification preferences to user profile (optional)

**Checkpoint**: Push notifications should work for new offers and order status changes with deep linking ✅ COMPLETE

---

## Phase 8: User Story 6 - Admin Offer Management (Priority: P2)

**Goal**: Enable admins to create bundled offers with discounted prices and quantity limits

**Independent Test**: Login to admin dashboard, create a new offer with multiple products and discounted prices, set quantity limits, verify offer appears correctly in mobile app

### Implementation for User Story 6

- [X] T102 [P] [US6] Create admin login page at admin/app/(auth)/login/page.tsx with email/password form
- [X] T103 [US6] Implement admin authentication in admin/lib/auth.ts with custom claims check
- [X] T104 [P] [US6] Setup admin dashboard layout at admin/app/(dashboard)/layout.tsx with navigation
- [X] T105 [US6] Create offers list page at admin/app/(dashboard)/offers/page.tsx with data table
- [X] T106 [US6] Create offer creation page at admin/app/(dashboard)/offers/new/page.tsx with form
- [X] T107 [P] [US6] Implement offer form component in admin/components/dashboard/OfferForm.tsx with react-hook-form
- [X] T108 [US6] Add product selection multi-select in offer form with search
- [X] T109 [US6] Implement individual product discount pricing inputs in offer form
- [X] T110 [US6] Add real-time discount total calculation in offer form
- [X] T111 [US6] Implement quantity limit inputs (min/max) in offer form
- [X] T112 [US6] Add offer status selection (draft/active/inactive) in offer form
- [X] T113 [US6] Implement offer image upload to Firebase Storage in admin/lib/storage.ts
- [X] T114 [US6] Create offer edit page at admin/app/(dashboard)/offers/[offerId]/edit/page.tsx
- [X] T115 [US6] Add offer deletion with confirmation modal
- [X] T116 [US6] Implement offer activation/deactivation toggle in offers list
- [X] T117 [US6] Display offer preview showing how it appears in mobile app
- [X] T118 [US6] Add validity period (validFrom/validUntil) inputs in offer form

**Checkpoint**: Admins should be able to create, edit, activate, and delete offers with full pricing control ✅ COMPLETE

---

## Phase 9: User Story 7 - Admin Individual Product Management (Priority: P2)

**Goal**: Enable admins to add and manage individual products with pricing and quantity limits

**Independent Test**: Add a new product through admin dashboard with price and quantity limits, verify it appears in mobile app and can be purchased

### Implementation for User Story 7

- [X] T119 [P] [US7] Create products list page at admin/app/(dashboard)/products/page.tsx with data table
- [X] T120 [US7] Create product creation page at admin/app/(dashboard)/products/new/page.tsx with form
- [X] T121 [P] [US7] Implement product form component in admin/components/dashboard/ProductForm.tsx with validation
- [X] T122 [US7] Add product name, description, and price inputs in product form
- [X] T123 [US7] Add category and tags inputs for product organization
- [X] T124 [US7] Implement product image upload to Firebase Storage with compression
- [X] T125 [US7] Generate thumbnail images (150x150) on upload in admin
- [X] T126 [US7] Add quantity limit inputs (min/max) in product form
- [X] T127 [US7] Add stock availability toggle (inStock boolean)
- [X] T128 [US7] Create product edit page at admin/app/(dashboard)/products/[productId]/edit/page.tsx
- [X] T129 [US7] Add product deletion with confirmation modal
- [X] T130 [US7] Implement product status toggle (active/inactive) in products list
- [X] T131 [US7] Add bulk product import functionality (CSV upload) at admin/app/(dashboard)/products/import/page.tsx
- [X] T132 [US7] Display product preview showing how it appears in mobile app

**Checkpoint**: Admins should be able to fully manage product catalog with images and pricing ✅ COMPLETE

---

## Phase 10: User Story 8 - Admin Order Management (Priority: P2)

**Goal**: Enable admins to view and manage customer orders for fulfillment

**Independent Test**: Place orders through mobile app and verify they appear in admin dashboard with full details including delivery/pickup information

### Implementation for User Story 8

- [X] T133 [P] [US8] Create orders list page at admin/app/(dashboard)/orders/page.tsx with filterable data table
- [X] T134 [US8] Create order details page at admin/app/(dashboard)/orders/[orderId]/page.tsx showing full breakdown
- [X] T135 [P] [US8] Display order items with offers expanded to show bundled products
- [X] T136 [P] [US8] Display delivery details (address, city, postal code, notes) for delivery orders
- [X] T137 [P] [US8] Display pickup details (pickup time, location) for pickup orders
- [X] T138 [US8] Implement order status update functionality with dropdown in order details
- [X] T139 [US8] Add status transition validation (pending → confirmed → preparing → out_for_delivery/ready_for_pickup → completed)
- [X] T140 [US8] Display order status history timeline showing all status changes with timestamps
- [X] T141 [US8] Add order filtering by status, date range, and fulfillment method
- [X] T142 [US8] Implement order search by order number, customer name, or email
- [X] T143 [US8] Display customer contact information for delivery coordination
- [X] T144 [US8] Add invoice download link in order details
- [X] T145 [US8] Implement order cancellation functionality for pending orders
- [X] T146 [US8] Add order metrics dashboard showing total orders, revenue, pending orders
- [X] T147 [US8] Real-time order updates using Firestore listeners in admin dashboard

**Checkpoint**: Admins should be able to view, filter, and manage all orders with full details ✅ COMPLETE

---

## Phase 11: Cart Validation Triggers

**Purpose**: Background functions to maintain cart integrity when offers change

- [ ] T148 [P] Implement invalidateCartsOnOfferChange Cloud Function in functions/src/cart/invalidateCartsOnOfferChange.ts
- [ ] T149 Implement batch cart update logic when offer is modified or deleted
- [ ] T150 Add logging for cart invalidation events in Cloud Functions

**Checkpoint**: Carts are automatically flagged when offers change, protecting users from invalid checkouts

---

## Phase 12: Admin User Management

**Purpose**: Enable super admins to create and manage admin accounts

- [ ] T151 [P] Implement createAdminUser Cloud Function in functions/src/admin/createAdminUser.ts
- [ ] T152 Create admin users list page at admin/app/(dashboard)/settings/admins/page.tsx
- [ ] T153 [P] Create admin user creation form at admin/app/(dashboard)/settings/admins/new/page.tsx
- [ ] T154 Add role selection (super_admin, admin, viewer) with permission descriptions
- [ ] T155 Implement admin user edit functionality
- [ ] T156 Add admin user deactivation toggle
- [ ] T157 Display admin activity logs (last login, recent actions)

**Checkpoint**: Super admins can manage admin accounts with role-based permissions

---

## Phase 13: Utility & Maintenance Functions

**Purpose**: Background tasks for system maintenance

- [ ] T158 [P] Implement cleanupExpiredVerificationCodes scheduled function in functions/src/utils/cleanupExpiredVerificationCodes.ts
- [ ] T159 [P] Configure Pub/Sub schedule (every 1 hour) in functions/src/index.ts
- [ ] T160 Add monitoring and alerting for failed Cloud Functions in Firebase Console

**Checkpoint**: Automated maintenance tasks keep database clean

---

## Phase 14: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T161 [P] Setup Firebase Hosting for admin dashboard deployment
- [ ] T162 [P] Configure EAS Build for mobile app (iOS and Android)
- [ ] T163 [P] Setup EAS Update for over-the-air updates
- [ ] T164 [P] Create seed data script in functions/src/utils/seedData.ts for development/testing
- [ ] T165 Add loading states and skeleton screens across mobile app
- [ ] T166 [P] Add error boundary components in mobile/app/_layout.tsx and admin/app/layout.tsx
- [ ] T167 Implement retry logic for failed Cloud Function calls in mobile app
- [ ] T168 [P] Add analytics tracking (Firebase Analytics) for key user actions
- [ ] T169 Optimize product images with WebP format and lazy loading
- [ ] T170 [P] Add mobile app splash screen and app icons in mobile/assets/
- [ ] T171 [P] Create admin dashboard favicon and branding
- [ ] T172 Implement rate limiting for Cloud Functions to prevent abuse
- [ ] T173 Add comprehensive error logging to Cloud Logging in all Cloud Functions
- [ ] T174 [P] Setup CI/CD pipeline (GitHub Actions) for automated deployment
- [ ] T175 Verify quickstart.md setup instructions by following them end-to-end
- [ ] T176 [P] Add accessibility improvements (ARIA labels, screen reader support) to mobile app
- [ ] T177 [P] Add accessibility improvements (WCAG compliance) to admin dashboard
- [ ] T178 Performance optimization: Enable Hermes engine in mobile/android/app/build.gradle
- [ ] T179 [P] Performance optimization: Implement virtualized lists for products/offers
- [ ] T180 Security audit: Review all Firestore security rules for edge cases
- [ ] T181 [P] Security audit: Review all Cloud Functions for input validation
- [ ] T182 Add production environment configuration and deployment instructions
- [ ] T183 Create admin user manual/documentation in docs/admin-guide.md
- [ ] T184 Create mobile app user guide in docs/user-guide.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-10)**: All depend on Foundational phase completion
  - User Story 1 (P1): Authentication foundation for all other stories
  - User Story 2 (P1): Can start after Foundational - Independent
  - User Story 3 (P1): Depends on US2 (needs products/offers to add to cart)
  - User Story 4 (P1): Depends on US3 (needs cart to create order)
  - User Story 5 (P2): Independent - Can start after Foundational
  - User Story 6 (P2): Depends on US1 (admin needs auth) - Independent from customer stories
  - User Story 7 (P2): Depends on US1 (admin needs auth) - Independent from customer stories
  - User Story 8 (P2): Depends on US4 (needs orders to manage)
- **Cart Validation (Phase 11)**: Depends on US3 (carts) and US6 (offers)
- **Admin User Management (Phase 12)**: Depends on US1 (auth foundation)
- **Utility Functions (Phase 13)**: Depends on US1 (user verification)
- **Polish (Phase 14)**: Depends on all desired user stories being complete

### Critical Path (MVP - P1 Stories Only)

1. **Phase 1**: Setup → **Phase 2**: Foundational
2. **Phase 3**: User Story 1 (Authentication) ← BLOCKING
3. **Phase 4**: User Story 2 (Browse Offers) ← Needs US1 complete
4. **Phase 5**: User Story 3 (Cart) ← Needs US2 complete
5. **Phase 6**: User Story 4 (Checkout) ← Needs US3 complete
6. **MVP Complete**: Users can register, browse, add to cart, and place orders

### Parallel Opportunities

**Within Setup (Phase 1)**:
- T002, T003, T004 (mobile/admin/functions init)
- T007, T008, T009 (dependencies)
- T010, T011 (config files)

**Within Foundational (Phase 2)**:
- T014-T018 (shared types for different entities)
- T020, T021 (Firestore/Storage rules)
- T023, T024 (Firebase Admin SDK in admin/functions)
- T026, T027, T028 (routing setup)
- T030, T031 (auth helpers)

**Within User Stories**:
- Cloud Functions within a story (e.g., T032, T033, T034 in US1)
- Components within a story (e.g., T049, T050 in US2)
- Forms and utilities within a story

**Across User Stories (after Foundational)**:
- US1 (Auth) MUST complete first
- After US1: US2, US5, US6, US7 can proceed in parallel (independent)
- US3 needs US2, US4 needs US3, US8 needs US4 (sequential)

---

## Parallel Example: Foundational Phase

```bash
# Launch all shared type definitions in parallel:
Task T014: "Define shared TypeScript interfaces in shared/types/product.ts"
Task T015: "Define shared TypeScript interfaces in shared/types/offer.ts"
Task T016: "Define shared TypeScript interfaces in shared/types/cart.ts"
Task T017: "Define shared TypeScript interfaces in shared/types/order.ts"
Task T018: "Define shared TypeScript interfaces in shared/types/notification.ts"

# Launch Firebase configuration tasks in parallel:
Task T020: "Configure Firestore indexes in firebase/firestore.indexes.json"
Task T021: "Configure Firebase Storage security rules in firebase/storage.rules"

# Launch SDK initialization in parallel:
Task T023: "Initialize Firebase Admin SDK in admin dashboard at admin/lib/firebase-admin.ts"
Task T024: "Initialize Firebase Admin SDK in Cloud Functions at functions/src/config/firebase-admin.ts"
```

---

## Parallel Example: User Story 1

```bash
# Launch all Cloud Functions for auth in parallel:
Task T032: "Implement sendVerificationCode Cloud Function in functions/src/auth/sendVerificationCode.ts"
Task T033: "Implement verifyCode Cloud Function in functions/src/auth/verifyCode.ts"
Task T034: "Implement resetPassword Cloud Function in functions/src/auth/resetPassword.ts"
Task T035: "Create User Firestore service in mobile/src/services/userService.ts"
```

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. **Complete Phase 1**: Setup → Foundation ready
2. **Complete Phase 2**: Foundational (CRITICAL) → Shared infrastructure ready
3. **Complete Phase 3**: User Story 1 (Auth) → Users can register/login
4. **Complete Phase 4**: User Story 2 (Browse) → Users can see offers
5. **Complete Phase 5**: User Story 3 (Cart) → Users can add items
6. **Complete Phase 6**: User Story 4 (Checkout) → Users can place orders
7. **VALIDATE MVP**: Test complete customer journey end-to-end
8. **Deploy/Demo MVP**

### Incremental Delivery (Add P2 Stories)

After MVP is validated:
1. **Phase 7**: User Story 5 (Notifications) → Engagement features
2. **Phase 8**: User Story 6 (Admin Offers) → Admin can manage offers
3. **Phase 9**: User Story 7 (Admin Products) → Admin can manage products
4. **Phase 10**: User Story 8 (Admin Orders) → Admin can fulfill orders
5. **Phase 11**: Cart Validation → Background integrity
6. **Phase 12**: Admin User Management → Multi-admin support
7. **Phase 13**: Utility Functions → Automated maintenance
8. **Phase 14**: Polish → Production-ready improvements

### Parallel Team Strategy

With multiple developers (after Foundational phase completes):

**Team A** (Customer Mobile App):
- User Story 1 → User Story 2 → User Story 3 → User Story 4

**Team B** (Admin Dashboard):
- Wait for US1 → User Story 6 || User Story 7 → User Story 8

**Team C** (Backend/Infrastructure):
- User Story 5 (Notifications) → Phase 11 (Cart Validation) → Phase 13 (Utilities)

---

## Notes

- [P] tasks = different files/services, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently testable after completion
- Commit after each task or logical group of related tasks
- Stop at any checkpoint to validate story functionality
- Phase 2 (Foundational) is CRITICAL and blocks all user story work
- User Story 1 (Authentication) must complete before admin stories can begin
- Tests are NOT included as they were not requested in the specification
- All file paths assume the monorepo structure defined in plan.md
- Use Firebase emulators for all local development and testing
- Follow quickstart.md for initial setup before beginning Phase 1

---

## Task Count Summary

- **Phase 1 (Setup)**: 12 tasks
- **Phase 2 (Foundational)**: 19 tasks (CRITICAL BLOCKER)
- **Phase 3 (US1 - Auth)**: 14 tasks
- **Phase 4 (US2 - Browse)**: 12 tasks
- **Phase 5 (US3 - Cart)**: 15 tasks
- **Phase 6 (US4 - Checkout)**: 16 tasks
- **Phase 7 (US5 - Notifications)**: 13 tasks
- **Phase 8 (US6 - Admin Offers)**: 17 tasks
- **Phase 9 (US7 - Admin Products)**: 14 tasks
- **Phase 10 (US8 - Admin Orders)**: 15 tasks
- **Phase 11 (Cart Validation)**: 3 tasks
- **Phase 12 (Admin Management)**: 7 tasks
- **Phase 13 (Utilities)**: 3 tasks
- **Phase 14 (Polish)**: 24 tasks

**Total**: 184 tasks

**MVP Scope** (P1 stories only): Phases 1-6 = 88 tasks
**Full Feature** (P1 + P2): All phases = 184 tasks

**Parallel Opportunities**: 60+ tasks marked [P] can run in parallel within their phases
