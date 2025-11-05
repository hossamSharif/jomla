# Research & Technical Decisions

**Feature**: Grocery Store Mobile App with Admin Dashboard
**Date**: 2025-11-05
**Phase**: 0 - Architecture Research

## Overview

This document captures the research findings and technical decisions for implementing a cross-platform mobile grocery store with admin dashboard. The system requires real-time synchronization, offline capabilities, SMS verification, push notifications, and complex cart logic with bundled offers.

## Key Technology Decisions

### 1. Mobile Application Framework

**Decision**: React Native with Expo SDK 50+

**Rationale**:
- **Single Codebase**: Write once, deploy to both iOS and Android, reducing development time by ~60%
- **Expo Ecosystem**: Built-in solutions for notifications (expo-notifications), SMS handling (expo-sms), and OTA updates
- **Firebase Integration**: Excellent Firebase SDK support with real-time listeners and offline persistence
- **Developer Experience**: Hot reload, TypeScript support, extensive community packages
- **AI-Assisted Development**: Well-documented patterns make it ideal for AI-assisted coding

**Alternatives Considered**:
- **Flutter**: Rejected - Dart language has smaller ecosystem; Firebase integration less mature than React Native
- **Native iOS/Android**: Rejected - 2x development effort; separate codebases harder to maintain
- **Ionic/Capacitor**: Rejected - Web-based approach has performance limitations for smooth 60fps scrolling

**Best Practices**:
- Use Expo Router for file-based navigation
- Implement React Query (@tanstack/react-query) for server state caching
- Use Zustand for local state (simpler than Redux for this scale)
- Enable Hermes engine for faster startup times
- Implement offline-first architecture with Firebase persistence

### 2. Admin Dashboard Framework

**Decision**: Next.js 14+ with App Router

**Rationale**:
- **Server Components**: Reduce client bundle size, fetch data on server for better performance
- **SEO Ready**: Not critical for admin dashboard but useful for potential marketing pages
- **Firebase Admin SDK**: Server-side Firebase operations for privileged admin actions
- **Modern DX**: TypeScript, fast refresh, excellent routing system
- **Deployment**: Easy deployment to Vercel, Netlify, or self-hosted

**Alternatives Considered**:
- **React SPA (Vite)**: Rejected - Loses server-side rendering benefits; no server actions for admin operations
- **Vue/Nuxt**: Rejected - Team/AI familiarity with React ecosystem; smaller Firebase integration community
- **Angular**: Rejected - Heavier framework; steeper learning curve; less AI-assisted coding resources

**Best Practices**:
- Use Server Components for data fetching by default
- Implement shadcn/ui for consistent, accessible UI components
- Use React Hook Form for complex forms (offer creation, product management)
- Implement route handlers for API endpoints that Cloud Functions call
- Use middleware for authentication checks

### 3. Backend Architecture

**Decision**: Firebase Backend-as-a-Service

**Rationale**:
- **Faster Development**: No need to build REST/GraphQL APIs from scratch; reduces backend development by ~70%
- **Real-time Synchronization**: Firestore's real-time listeners perfect for:
  - Cart updates when offers change
  - Order status notifications
  - New offer announcements
- **Built-in Services**: Authentication, file storage, cloud functions all integrated
- **Offline Support**: Built-in offline persistence for mobile app
- **Security**: Declarative security rules instead of API middleware
- **Scalability**: Auto-scaling infrastructure; pay-per-use pricing
- **Cost-Effective**: Free tier generous for MVP; scales predictably

**Alternatives Considered**:
- **Custom Node.js API (Express/Fastify)**: Rejected - Requires building auth, real-time, storage from scratch; higher maintenance
- **GraphQL (Apollo)**: Rejected - Adds complexity for CRUD operations; Firebase queries sufficient
- **Supabase**: Rejected - PostgreSQL better for relational data, but our data model is document-oriented (offers with nested products)
- **AWS Amplify**: Rejected - More complex setup; Firebase has better mobile SDK experience

**Firebase Services Usage**:

| Service | Use Case |
|---------|----------|
| Firestore | Primary database (users, products, offers, orders, carts) |
| Firebase Auth | User authentication (email/password) |
| Cloud Functions | SMS verification, invoice generation, notifications, cart validation |
| Firebase Storage | Product images with automatic CDN |
| FCM (Firebase Cloud Messaging) | Push notifications to mobile app |
| Firebase Extensions | Potential use: Twilio SMS, Algolia search |

### 4. SMS Verification Strategy

**Decision**: Twilio via Firebase Cloud Functions

**Rationale**:
- **Reliability**: 99.95% uptime SLA; global SMS delivery
- **Firebase Integration**: Official Firebase Extension available
- **Verification API**: Twilio Verify API handles code generation, expiry (30 min), rate limiting (3 attempts/hour)
- **Cost**: $0.05/verification (acceptable for user acquisition cost)

**Alternatives Considered**:
- **AWS SNS**: Rejected - More complex integration with Firebase; no built-in verification flow
- **Custom SMS Gateway**: Rejected - Requires building rate limiting, code management, expiry logic

**Implementation Pattern**:
```typescript
// Cloud Function triggered by client
export const sendVerificationCode = functions.https.onCall(async (data, context) => {
  // Twilio Verify API handles:
  // - Code generation (6-digit)
  // - SMS delivery
  // - 30-minute expiry
  // - Rate limiting (3 sends per hour)
});
```

### 5. Push Notifications Architecture

**Decision**: Firebase Cloud Messaging (FCM) with Cloud Functions triggers

**Rationale**:
- **Cross-Platform**: Single API for iOS (APNS) and Android
- **Free**: No per-message cost
- **Expo Integration**: expo-notifications wraps FCM seamlessly
- **Topic-Based**: Send to all users for new offers; individual targeting for order updates

**Notification Triggers** (Cloud Functions):
- **New Offer Published**: Firestore trigger on `offers` collection → send to topic `all-users`
- **Order Status Change**: Firestore trigger on `orders/{orderId}` → send to user-specific topic

**Best Practices**:
- Store FCM tokens in user document
- Handle token refresh in mobile app
- Implement deep linking for notification taps
- Use data payloads for silent sync notifications

### 6. State Management Strategy

**Decision**: Zustand for mobile app, React Hook Form for admin dashboard

**Rationale**:
- **Zustand**: Minimal boilerplate compared to Redux; ~300 bytes; perfect for cart, auth state
- **React Query**: Cache Firebase queries; automatic refetching; optimistic updates
- **React Hook Form**: Complex forms (offer creation) with validation; minimal re-renders

**Alternatives Considered**:
- **Redux Toolkit**: Rejected - Too much boilerplate for this scale; Zustand sufficient
- **Context API**: Rejected - Performance issues with frequent cart updates
- **Jotai/Recoil**: Rejected - Less mature; Zustand has proven track record

**Data Flow**:
```
Firebase Firestore ←→ React Query (cache) ←→ UI Components
                                           ↓
                                       Zustand (local state)
                                       - Cart (offline)
                                       - Auth state
```

### 7. Cart Validation Strategy

**Decision**: Cloud Function validation on checkout + client-side real-time warnings

**Rationale**:
- **Client-Side**: Real-time warnings when opening cart (offer changed/removed)
- **Server-Side**: Final validation in Cloud Function before order creation (security)
- **Firestore Trigger**: When admin modifies/deletes offer, mark affected carts with flag

**Implementation Pattern**:
```typescript
// Cloud Function on offer update
export const onOfferUpdate = functions.firestore
  .document('offers/{offerId}')
  .onUpdate(async (change, context) => {
    // Find all carts with this offer
    // Add invalidation flag
    // Client shows warning on next cart open
  });
```

### 8. Invoice Generation

**Decision**: Cloud Function with PDF generation library (pdfkit or puppeteer)

**Rationale**:
- **Server-Side**: Heavy PDF generation offloaded from mobile app
- **Consistent Formatting**: Template-based generation
- **Storage**: Save to Firebase Storage; return download URL

**Alternatives Considered**:
- **Third-Party (Stripe Invoicing)**: Rejected - Overkill for simple receipts
- **Client-Side**: Rejected - Large bundle size; inconsistent results across devices

**Libraries**:
- **pdfkit**: Lightweight, programmatic PDF creation
- **puppeteer**: HTML to PDF (if complex layouts needed)

### 9. Image Optimization Strategy

**Decision**: Firebase Storage with client-side compression before upload

**Rationale**:
- **Upload**: Compress images to <500KB using expo-image-manipulator before upload
- **Storage**: Firebase Storage provides automatic CDN
- **Delivery**: Use resize URLs or Cloud Storage for Firebase extensions

**Best Practices**:
- Upload multiple sizes (thumbnail, medium, full)
- Use WebP format where supported
- Lazy load images in product lists

### 10. Testing Strategy

**Decision**: Jest + Testing Library + Firebase Emulator Suite

**Component Testing**:
- **Mobile**: Jest + React Native Testing Library
- **Admin**: Jest + React Testing Library
- **Focus**: User interactions, form validation, navigation

**Integration Testing**:
- **Firebase Emulator Suite**: Test Cloud Functions, Firestore rules, auth flows locally
- **Test Data**: Seed emulator with realistic product/offer data
- **E2E**: Detox for critical mobile flows (registration, checkout)

**Cloud Functions Testing**:
- **Unit**: Test pure functions (price calculations, validation logic)
- **Integration**: Test Firestore triggers with emulator

### 11. Security Considerations

**Firestore Security Rules**:
```javascript
// Users can only read/write their own cart
match /carts/{userId} {
  allow read, write: if request.auth.uid == userId;
}

// All users can read active offers
match /offers/{offerId} {
  allow read: if request.auth != null && resource.data.status == 'active';
  allow write: if request.auth.token.admin == true;  // Admin only
}
```

**Authentication**:
- Email/password with Firebase Auth
- Phone verification required before account activation
- Session management: 30-day sliding expiration
- Password reset via SMS

**Data Validation**:
- Client-side: Immediate user feedback
- Cloud Functions: Final validation (security boundary)
- Firestore Rules: Additional protection layer

### 12. Development Workflow

**Monorepo Setup**:
- **Tools**: npm workspaces or yarn workspaces
- **Shared Code**: `shared/types` for TypeScript interfaces
- **Scripts**: Root-level scripts to run mobile/admin/functions

**Version Control**:
- Feature branches for each user story
- PR reviews before merge
- Semantic versioning for releases

**CI/CD**:
- **Mobile**: EAS Build for app binaries; EAS Update for OTA updates
- **Admin**: Vercel auto-deploy on merge to main
- **Functions**: Firebase deploy via GitHub Actions

## Research Findings by Topic

### Performance Optimization

**Mobile App Startup**:
- Enable Hermes JavaScript engine (default in Expo SDK 50+)
- Use `react-native-fast-image` for image caching
- Implement virtualized lists (FlatList) for products/offers
- Lazy load screens with React.lazy

**Firestore Query Optimization**:
- Create composite indexes for complex queries (spec.md → clarify.md filters)
- Use pagination (limit + startAfter) for product lists
- Cache frequently accessed data (active offers) with React Query

### Offline Support

**Mobile App**:
- Enable Firestore offline persistence: `enableIndexedDbPersistence()`
- Store cart in local state (Zustand with AsyncStorage)
- Queue orders for submission when online
- Show offline indicator in UI

### Cost Estimation

**Firebase Pricing** (initial 1000 users, 1000 orders/day):
- Firestore: ~$25/month (reads/writes within free tier limits with caching)
- Cloud Functions: ~$5/month (< 2M invocations/month)
- Storage: ~$5/month (10GB product images)
- FCM: Free
- **Total: ~$35/month** (scales with usage)

**Third-Party**:
- Twilio SMS: ~$50/month (1000 verifications at $0.05 each)
- Expo EAS: ~$29/month (for OTA updates)

**Estimated Total**: ~$115/month for MVP

## Open Questions & Risks

### Questions to Clarify
- [ ] Payment gateway integration (Stripe, PayPal, local payment provider?)
- [ ] Delivery zone management (how to define service areas?)
- [ ] Product catalog management (import from existing system? manual entry?)
- [ ] Admin user management (single admin or role-based access control?)

### Technical Risks
- **SMS Delivery**: Twilio reliability in target region (TEST in staging)
- **Offline Conflicts**: Multiple devices modifying same cart (last-write-wins acceptable?)
- **Real-time Scale**: Firestore listener limits (100k concurrent connections per database)
- **Image Storage**: Large catalogs (5000 products × 3 images = 15k images, ~7.5GB)

### Mitigation Strategies
- **SMS**: Implement fallback to email verification if SMS fails repeatedly
- **Offline**: Implement conflict resolution UI (show user both versions)
- **Scale**: Monitor Firestore metrics; consider sharding if approaching limits
- **Images**: Implement lazy loading; CDN caching; consider Cloudinary for advanced optimization

## Next Steps (Phase 1)

1. **Data Model Design** (`data-model.md`):
   - Firestore collection schemas
   - Document structure for offers (nested products vs. references)
   - Relationships between users, carts, orders, offers, products

2. **API Contracts** (`contracts/`):
   - Cloud Function interfaces (callable functions)
   - Request/response schemas
   - Error codes and handling

3. **Quickstart Guide** (`quickstart.md`):
   - Local development setup (Firebase emulator, Expo, Next.js)
   - Environment variables configuration
   - Testing workflow

## References

- [Firebase Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [Expo Documentation](https://docs.expo.dev/)
- [Next.js App Router Guide](https://nextjs.org/docs/app)
- [Twilio Verify API](https://www.twilio.com/docs/verify/api)
