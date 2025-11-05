# Jomla Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-05

## Active Technologies

### Languages
- TypeScript (React Native - Expo SDK 50+, Next.js 14+, Cloud Functions - Node.js 18+)

### Mobile App (iOS + Android)
- React Native with Expo SDK 50+
- expo-notifications - Push notifications
- expo-sms - SMS verification
- @react-navigation/native - Navigation
- zustand - State management
- @tanstack/react-query - Data fetching/caching
- Firebase SDK

### Admin Dashboard
- Next.js 14+ with App Router
- Tailwind CSS - Styling
- shadcn/ui - UI components
- react-hook-form - Forms
- Firebase Admin SDK

### Backend
- Firebase Firestore - NoSQL document database
- Firebase Auth - Authentication
- Firebase Cloud Functions - Server-side logic (TypeScript/Node.js 18+)
- Firebase Storage - Product images
- Firebase Cloud Messaging (FCM) - Push notifications
- Twilio Verify API - SMS verification

### Testing
- Jest - Test framework
- React Native Testing Library - Mobile testing
- React Testing Library - Admin testing
- Firebase Emulator Suite - Backend testing

## Project Structure

```text
mobile/                           # React Native Expo app
├── app/                          # Expo Router screens
│   ├── (auth)/                   # Authentication flow
│   ├── (tabs)/                   # Main tab navigation
│   └── orders/                   # Orders flow
├── src/
│   ├── components/               # Reusable UI components
│   ├── services/                 # Firebase service layer
│   ├── hooks/                    # Custom React hooks
│   ├── store/                    # Zustand state management
│   ├── types/                    # TypeScript types
│   └── utils/                    # Helper functions
└── __tests__/

admin/                            # Next.js admin dashboard
├── app/                          # Next.js App Router
│   ├── (auth)/
│   └── (dashboard)/
│       ├── products/
│       ├── offers/
│       ├── orders/
│       └── settings/
├── components/
│   ├── ui/                       # shadcn/ui components
│   └── dashboard/
├── lib/
│   ├── firebase-admin.ts
│   └── utils.ts
└── __tests__/

functions/                        # Firebase Cloud Functions
├── src/
│   ├── auth/                     # SMS verification, password reset
│   ├── orders/                   # Order processing, invoice generation
│   ├── notifications/            # Push notification triggers
│   ├── cart/                     # Cart validation logic
│   └── utils/
└── __tests__/

firebase/                         # Firebase configuration
├── firestore.rules               # Security rules
├── firestore.indexes.json        # Database indexes
├── storage.rules
└── firebase.json

shared/                           # Shared types and utilities
├── types/                        # Common TypeScript interfaces
└── constants/

specs/                            # Feature specifications
└── 001-grocery-store-app/
    ├── spec.md
    ├── plan.md
    ├── research.md
    ├── data-model.md
    ├── quickstart.md
    └── contracts/
```

## Commands

### Development
```bash
# Start Firebase emulators
firebase emulators:start

# Run mobile app
cd mobile && npm start

# Run admin dashboard
cd admin && npm run dev

# Run tests
npm test
```

### Deployment
```bash
# Deploy Cloud Functions
firebase deploy --only functions

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Build mobile app
cd mobile && eas build --platform ios/android

# Deploy admin dashboard
cd admin && npm run build
```

## Code Style

### TypeScript
- Strict mode enabled
- Use interfaces for data models (see `shared/types/`)
- Prefer type safety over `any`

### React/React Native
- Functional components with hooks
- Use TypeScript for props
- Keep components small and focused

### Firebase
- All prices stored in cents (integers) to avoid floating-point errors
- Use transactions for critical operations
- Enable offline persistence for mobile app
- Denormalize data for read performance where appropriate

### Security
- Validate on client (UX), Cloud Functions (security), and Firestore rules (defense in depth)
- Never store sensitive data in Firestore (passwords handled by Firebase Auth)
- Use custom claims for admin roles

## Recent Changes



<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
