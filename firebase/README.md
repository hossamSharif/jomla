# Firebase Configuration

This directory contains Firebase configuration files for the Jomla grocery store application.

## Files

- **firestore.rules**: Security rules for Firestore database
- **firestore.indexes.json**: Database indexes for optimized queries
- **storage.rules**: Security rules for Firebase Storage (product images, invoices)

## Setup

Before deploying these configurations, ensure you have:

1. Created a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Installed Firebase CLI: `npm install -g firebase-tools`
3. Logged in: `firebase login`
4. Initialized the project: `firebase init`

## Deployment

Deploy rules and indexes:

```bash
# Deploy all Firebase configuration
firebase deploy

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only Firestore indexes
firebase deploy --only firestore:indexes

# Deploy only Storage rules
firebase deploy --only storage
```

## Local Development

Use Firebase Emulator Suite for local development:

```bash
# Start all emulators
firebase emulators:start

# Emulator UI available at: http://localhost:4000
# Firestore: http://localhost:8080
# Auth: http://localhost:9099
# Storage: http://localhost:9199
# Functions: http://localhost:5001
```

## Security Rules Summary

### Firestore Rules

- **Users**: Can read/update their own profile
- **Products**: All authenticated users can read active products; only admins can write
- **Offers**: All authenticated users can read active offers; only admins can write
- **Carts**: Users can only access their own cart
- **Orders**: Users can read/create their own orders; only admins can update
- **Admin Users**: Only admins can read; only super admins can write
- **Notifications**: Users can read their own notifications

### Storage Rules

- **Product/Offer Images**: All authenticated users can read; only admins can write
- **Invoices**: Authenticated users can read; only Cloud Functions can write
- **User Profile Images**: Users can read/write their own images

## Testing Rules

Test security rules locally:

```bash
# Start emulators
firebase emulators:start

# Run security rules tests (create tests in __tests__ directory)
npm test
```

## Indexes

Indexes are automatically created for:

- Product queries by status, category, and creation date
- Offer queries by status, publication date, and validity period
- Order queries by user ID, status, and creation date
- Notification queries by user ID, type, and sent date

Firebase will suggest additional indexes as queries are executed. Add them to `firestore.indexes.json`.
