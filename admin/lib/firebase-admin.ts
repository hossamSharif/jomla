/**
 * Firebase Admin SDK Initialization for Admin Dashboard
 *
 * Initializes Firebase Admin SDK with service account credentials and emulator detection.
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK only once
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'production';

  // Initialize with service account in production, or with emulator settings in development
  if (useEmulator && environment === 'development') {
    // Use emulator settings
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
    process.env.FIREBASE_STORAGE_EMULATOR_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'localhost:9199';

    admin.initializeApp({
      projectId: projectId || 'demo-project',
    });

    console.log('Firebase Admin SDK initialized with emulator settings');
  } else {
    // Production initialization with service account
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Missing Firebase Admin SDK credentials. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.'
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

    console.log('Firebase Admin SDK initialized with service account');
  }
}

// Export Firebase Admin services
export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminStorage = admin.storage();
export const adminMessaging = admin.messaging();

// Export admin SDK instance
export default admin;

// Helper functions

/**
 * Verify Firebase ID token
 */
export async function verifyIdToken(token: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Set custom claims for admin users
 */
export async function setAdminClaim(uid: string, isAdmin: boolean) {
  try {
    await adminAuth.setCustomUserClaims(uid, { admin: isAdmin });
    console.log(`Admin claim set for user ${uid}: ${isAdmin}`);
  } catch (error) {
    console.error('Error setting admin claim:', error);
    throw error;
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  try {
    const user = await adminAuth.getUserByEmail(email);
    return user;
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
}

/**
 * Create a new admin user
 */
export async function createAdminUser(email: string, password: string) {
  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      emailVerified: true,
    });

    // Set admin custom claim
    await setAdminClaim(userRecord.uid, true);

    return userRecord;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}
