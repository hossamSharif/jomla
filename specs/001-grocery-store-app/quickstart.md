# Development Quickstart Guide

**Feature**: Grocery Store Mobile App with Admin Dashboard
**Date**: 2025-11-05
**Phase**: 1 - Design

## Overview

This guide walks you through setting up the local development environment for the grocery store application. After completing this guide, you'll be able to:
- Run the mobile app on iOS/Android simulator
- Run the admin dashboard locally
- Test Cloud Functions with Firebase emulator
- Run the test suite

## Prerequisites

### Required Software

1. **Node.js 18+**
   ```bash
   node --version  # Should be v18.0.0 or higher
   ```
   Install: https://nodejs.org/

2. **npm or Yarn**
   ```bash
   npm --version   # v9.0.0 or higher
   ```

3. **Git**
   ```bash
   git --version
   ```

4. **Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase --version  # Should be v13.0.0 or higher
   ```

5. **Java JDK 17** (for Android development)
   ```bash
   java -version  # Should be 17.x.x
   ```
   Install: https://adoptium.net/

6. **Xcode** (for iOS development, macOS only)
   - Install from Mac App Store
   - Version 14.0 or higher
   - Run: `xcode-select --install`

### Optional Software

7. **Android Studio** (for Android emulator)
   - Download: https://developer.android.com/studio
   - Install Android SDK API level 33 or higher

8. **VS Code** (recommended editor)
   - Download: https://code.visualstudio.com/
   - Recommended extensions:
     - ESLint
     - Prettier
     - Firebase
     - React Native Tools

## Project Structure

```text
Jomla/
├── mobile/              # React Native Expo app
├── admin/               # Next.js admin dashboard
├── functions/           # Firebase Cloud Functions
├── firebase/            # Firebase configuration
├── shared/              # Shared TypeScript types
└── specs/               # Feature specifications
```

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd Jomla
```

### 2. Install Dependencies

Install dependencies for all projects:

```bash
# Install root dependencies (if using monorepo setup)
npm install

# Install mobile app dependencies
cd mobile
npm install
cd ..

# Install admin dashboard dependencies
cd admin
npm install
cd ..

# Install Cloud Functions dependencies
cd functions
npm install
cd ..
```

### 3. Firebase Project Setup

#### Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: "grocery-store-dev" (for development)
4. Enable Google Analytics (optional)

#### Initialize Firebase in Local Project

```bash
# Login to Firebase
firebase login

# Initialize Firebase (from project root)
firebase init

# Select the following features:
# - Firestore
# - Functions
# - Hosting (for admin dashboard)
# - Emulators

# Follow prompts:
# - Select your Firebase project
# - Firestore rules: firebase/firestore.rules
# - Firestore indexes: firebase/firestore.indexes.json
# - Functions: Use existing functions directory
# - Hosting public directory: admin/out
# - Configure as single-page app: Yes
# - Emulators: Select Firestore, Functions, Auth, Storage
```

#### Configure Firebase Credentials

1. **Get Firebase Config for Mobile/Admin**:
   - Go to Firebase Console → Project Settings
   - Under "Your apps", add a Web app
   - Copy the config object

2. **Create Environment Files**:

**Mobile** (`mobile/.env`):
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**Admin** (`admin/.env.local`):
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (for server-side)
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

3. **Get Firebase Admin SDK Key**:
   - Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save JSON file as `functions/service-account.json`
   - **DO NOT COMMIT THIS FILE** (already in .gitignore)

### 4. Initialize Firestore

```bash
# Start Firebase emulator
firebase emulators:start

# In another terminal, seed initial data
cd functions
npm run seed-data
```

The seed script should create:
- Sample products (20-30 items)
- Sample offers (5-10 bundles)
- Test admin user
- Test customer user

## Running the Applications

### Mobile App (Expo)

```bash
cd mobile

# Start Expo development server
npm start

# Or run directly on specific platform
npm run ios       # iOS simulator (macOS only)
npm run android   # Android emulator
npm run web       # Web browser (for quick testing)
```

**First-time iOS setup**:
```bash
# Install iOS dependencies
cd ios && pod install && cd ..
```

**First-time Android setup**:
1. Open Android Studio
2. Tools → AVD Manager
3. Create Virtual Device (Pixel 5, API 33+)
4. Start emulator

**Expo Go** (physical device):
1. Install Expo Go from App Store/Play Store
2. Scan QR code from terminal

### Admin Dashboard (Next.js)

```bash
cd admin

# Run development server
npm run dev

# Dashboard available at: http://localhost:3000
```

Default admin credentials (from seed data):
- Email: admin@grocery.com
- Password: admin123

### Firebase Emulators

```bash
# From project root
firebase emulators:start

# Emulator UI available at: http://localhost:4000
# Firestore: http://localhost:8080
# Functions: http://localhost:5001
# Auth: http://localhost:9099
```

**Emulator Benefits**:
- Test without consuming Firebase quota
- Reset data easily
- Debug Cloud Functions locally
- Test security rules

### Cloud Functions (for development)

Cloud Functions run automatically in emulator. To test individually:

```bash
cd functions

# Run tests
npm test

# Deploy to Firebase (staging)
firebase deploy --only functions --project staging

# Deploy single function
firebase deploy --only functions:sendVerificationCode
```

## Development Workflow

### Typical Development Session

1. **Start Firebase Emulators** (Terminal 1):
   ```bash
   firebase emulators:start
   ```

2. **Start Mobile App** (Terminal 2):
   ```bash
   cd mobile && npm start
   ```

3. **Start Admin Dashboard** (Terminal 3):
   ```bash
   cd admin && npm run dev
   ```

4. **Make code changes**:
   - Mobile/Admin: Hot reload automatically
   - Functions: Restart emulator or use `--watch` flag

### Testing Workflow

```bash
# Run all tests
npm test

# Run mobile tests
cd mobile && npm test

# Run admin tests
cd admin && npm test

# Run functions tests (with emulator)
cd functions && npm test

# Run end-to-end tests (mobile)
cd mobile && npm run test:e2e
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/user-registration

# Make changes, commit frequently
git add .
git commit -m "feat: implement user registration screen"

# Push to remote
git push origin feature/user-registration

# Create pull request on GitHub
```

## Common Tasks

### Create New Cloud Function

```bash
cd functions/src

# Create new function file (e.g., auth/newFunction.ts)
# Export function in src/index.ts
# Add tests in __tests__/auth/newFunction.test.ts
```

### Add New Mobile Screen

```bash
cd mobile/app

# Create new screen file (e.g., (tabs)/new-screen.tsx)
# Expo Router automatically adds route
# Create tests in __tests__/screens/new-screen.test.tsx
```

### Add New Admin Page

```bash
cd admin/app/(dashboard)

# Create new page (e.g., new-page/page.tsx)
# Next.js App Router automatically adds route
```

### Update Firestore Schema

1. Update TypeScript types in `shared/types/`
2. Update `data-model.md` documentation
3. Update Firestore rules in `firebase/firestore.rules`
4. Test rules: `firebase emulators:start` → Emulator UI → Rules tab

### Add New Dependencies

```bash
# Mobile
cd mobile
npm install <package>

# Admin
cd admin
npm install <package>

# Functions
cd functions
npm install <package>

# Shared (if needed)
npm install <package> --workspace=shared
```

## Troubleshooting

### Mobile App Won't Start

**Issue**: Metro bundler errors

**Solution**:
```bash
cd mobile
rm -rf node_modules
npm install
npm start -- --clear
```

**Issue**: iOS build fails

**Solution**:
```bash
cd mobile/ios
pod install
cd ..
npm run ios
```

### Firebase Emulator Issues

**Issue**: Port already in use

**Solution**:
```bash
# Kill process on port 8080 (or other Firebase port)
lsof -ti:8080 | xargs kill -9

# Or change port in firebase.json
```

**Issue**: Functions not loading

**Solution**:
```bash
cd functions
npm run build
cd ..
firebase emulators:start
```

### Authentication Issues

**Issue**: Can't login in emulator

**Solution**:
- Check Firebase emulator is running
- Verify `.env` files have correct config
- Clear browser/app cache

### Build Errors

**Issue**: TypeScript errors

**Solution**:
```bash
# Check types
npm run type-check

# Rebuild
npm run build
```

## Environment-Specific Configuration

### Development (Local Emulator)

- Uses Firebase emulator
- No SMS sending (mock Twilio)
- No push notifications (logs only)
- Test data seeded automatically

### Staging (Firebase Test Project)

- Real Firebase project
- Twilio test credentials
- Limited push notifications
- Can reset data freely

### Production (Firebase Live Project)

- Real Firebase project
- Real Twilio account
- Full push notifications
- Strict security rules

### Environment Selection

Mobile/Admin detect environment automatically:
```typescript
const isEmulator = window.location.hostname === 'localhost';

if (isEmulator) {
  connectFirestoreEmulator(firestore, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
}
```

## Testing Checklist

Before committing code, verify:

- [ ] All tests pass: `npm test`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] No linting errors: `npm run lint`
- [ ] Mobile app builds: `npm run build` (in mobile/)
- [ ] Admin builds: `npm run build` (in admin/)
- [ ] Functions deploy: `firebase deploy --only functions --project staging`

## Useful Commands

### Firebase

```bash
# Deploy everything
firebase deploy

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only functions
firebase deploy --only functions

# Deploy only hosting (admin)
firebase deploy --only hosting

# View logs
firebase functions:log
```

### Mobile (Expo)

```bash
# Clear cache
npm start -- --clear

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Over-the-air update
eas update --branch production
```

### Admin (Next.js)

```bash
# Build for production
npm run build

# Start production server
npm run start

# Analyze bundle size
npm run analyze
```

## Next Steps

1. **Read the Feature Spec**: `specs/001-grocery-store-app/spec.md`
2. **Review Data Model**: `specs/001-grocery-store-app/data-model.md`
3. **Understand API Contracts**: `specs/001-grocery-store-app/contracts/`
4. **Start Implementation**: Run `/speckit.tasks` to generate task list

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Twilio Verify API](https://www.twilio.com/docs/verify/api)

## Support

For issues or questions:
- Check existing GitHub issues
- Create new issue with detailed description
- Include error logs and steps to reproduce
