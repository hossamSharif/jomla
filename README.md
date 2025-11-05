# Jomla - Grocery Store Mobile App with Admin Dashboard

A comprehensive grocery e-commerce platform with cross-platform mobile app (iOS + Android) and web-based admin dashboard.

## Project Overview

Jomla enables customers to browse and purchase grocery products through bundled offers or individual items, with support for delivery and pickup fulfillment. Admins can manage products, create promotional offers with granular pricing control, and track orders in real-time.

## Tech Stack

### Mobile App
- **Framework**: React Native with Expo SDK 50+
- **Language**: TypeScript
- **State Management**: Zustand
- **Data Fetching**: @tanstack/react-query
- **Navigation**: Expo Router
- **Notifications**: expo-notifications, Firebase Cloud Messaging
- **SMS**: expo-sms for verification

### Admin Dashboard
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Forms**: react-hook-form
- **Authentication**: Firebase Admin SDK

### Backend
- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Auth
- **Functions**: Firebase Cloud Functions (TypeScript/Node.js 18+)
- **Storage**: Firebase Storage
- **Notifications**: Firebase Cloud Messaging
- **SMS Verification**: Twilio Verify API

## Project Structure

```
Jomla/
├── mobile/              # React Native Expo app
│   ├── app/            # Expo Router screens
│   ├── src/            # Source code
│   └── package.json
├── admin/               # Next.js admin dashboard
│   ├── app/            # Next.js App Router
│   ├── components/     # React components
│   ├── lib/            # Utility libraries
│   └── package.json
├── functions/           # Firebase Cloud Functions
│   ├── src/            # Function source code
│   └── package.json
├── firebase/            # Firebase configuration
│   ├── firestore.rules
│   ├── firestore.indexes.json
│   └── storage.rules
├── shared/              # Shared TypeScript types
│   ├── types/          # Common interfaces
│   └── constants/      # Shared constants
├── specs/               # Feature specifications
│   └── 001-grocery-store-app/
└── firebase.json        # Firebase project config
```

## Getting Started

### Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- npm or Yarn
- Firebase CLI: `npm install -g firebase-tools`
- Git
- Java JDK 17 (for Android development)
- Xcode 14+ (for iOS development, macOS only)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Jomla
   ```

2. **Install dependencies**
   ```bash
   # Install mobile app dependencies
   cd mobile && npm install && cd ..

   # Install admin dashboard dependencies
   cd admin && npm install && cd ..

   # Install Cloud Functions dependencies
   cd functions && npm install && cd ..

   # Install shared package dependencies
   cd shared && npm install && cd ..
   ```

3. **Firebase Setup**
   ```bash
   # Login to Firebase
   firebase login

   # Initialize Firebase (if not already initialized)
   firebase init

   # Create environment files (see below)
   ```

4. **Environment Configuration**

   Create the following environment files:

   **Mobile** (`mobile/.env`):
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

   **Admin** (`admin/.env.local`):
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   FIREBASE_ADMIN_PROJECT_ID=your_project_id
   FIREBASE_ADMIN_CLIENT_EMAIL=your_service_account_email
   FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

   **Functions** (`functions/.env`):
   ```env
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid
   ```

### Running the Application

#### Development Mode

1. **Start Firebase Emulators** (Terminal 1)
   ```bash
   firebase emulators:start
   ```
   Emulator UI: http://localhost:4000

2. **Start Mobile App** (Terminal 2)
   ```bash
   cd mobile
   npm start

   # Or run directly on platform
   npm run ios       # iOS simulator (macOS only)
   npm run android   # Android emulator
   npm run web       # Web browser
   ```

3. **Start Admin Dashboard** (Terminal 3)
   ```bash
   cd admin
   npm run dev
   ```
   Admin dashboard: http://localhost:3000

#### Building for Production

**Mobile App:**
```bash
cd mobile
eas build --platform ios
eas build --platform android
```

**Admin Dashboard:**
```bash
cd admin
npm run build
npm run start
```

**Cloud Functions:**
```bash
cd functions
npm run build
firebase deploy --only functions
```

## Features

### Customer Mobile App
- User registration with SMS verification
- Browse product offers and individual products
- Add items to cart (mixed offers and products)
- Checkout with delivery or pickup options
- Order tracking with push notifications
- Order history and invoice download

### Admin Dashboard
- Product management (CRUD operations)
- Offer creation with granular pricing control
- Order management and fulfillment tracking
- Admin user management with role-based permissions
- Real-time order updates
- Analytics and reporting

## Development Workflow

### Running Tests
```bash
# Run all tests
npm test

# Run mobile tests
cd mobile && npm test

# Run admin tests
cd admin && npm test

# Run functions tests
cd functions && npm test
```

### Linting
```bash
# Lint all code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Type Checking
```bash
# Check types in all projects
npm run type-check
```

## Documentation

- **Feature Specification**: `specs/001-grocery-store-app/spec.md`
- **Implementation Plan**: `specs/001-grocery-store-app/plan.md`
- **Data Model**: `specs/001-grocery-store-app/data-model.md`
- **Quickstart Guide**: `specs/001-grocery-store-app/quickstart.md`
- **API Contracts**: `specs/001-grocery-store-app/contracts/`
- **Firebase Configuration**: `firebase/README.md`

## Architecture

### Monorepo Structure
The project uses a monorepo structure with independent applications:
- **mobile/**: Cross-platform mobile app (Expo)
- **admin/**: Web admin dashboard (Next.js)
- **functions/**: Backend business logic (Firebase Cloud Functions)
- **shared/**: Shared TypeScript types and constants

### Data Flow
1. Mobile/Admin → Firebase Auth (authentication)
2. Mobile/Admin → Firestore (data queries)
3. Mobile/Admin → Cloud Functions (business logic)
4. Cloud Functions → Firestore (validated writes)
5. Cloud Functions → FCM (push notifications)
6. Cloud Functions → Twilio (SMS verification)

### Security
- Firestore security rules enforce data access control
- Firebase Admin SDK in Cloud Functions for privileged operations
- Custom claims for admin role management
- Input validation on client, functions, and security rules

## Contributing

1. Create a feature branch from `master`
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## Support

For issues or questions:
- Check `specs/001-grocery-store-app/quickstart.md` for common problems
- Review Firebase documentation
- Create an issue with detailed description

## License

[License information]

---

**Status**: Phase 1 Setup Complete (T001-T007) ✅
**Next Phase**: Phase 2 Foundational (T013-T031)
