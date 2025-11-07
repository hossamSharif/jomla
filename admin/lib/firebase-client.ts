/**
 * Firebase Client SDK for Admin Dashboard
 *
 * Client-side Firebase initialization for authentication
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Set auth persistence to LOCAL (persists even after browser close)
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('Error setting auth persistence:', error);
  });
}

// Connect to emulators in development
if (
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' &&
  process.env.NEXT_PUBLIC_ENVIRONMENT === 'development'
) {
  const authEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
  const firestoreEmulatorHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || 'localhost:8080';
  const storageEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST || 'localhost:9199';

  // Parse host and port
  const [authHost, authPort] = authEmulatorHost.split(':');
  const [firestoreHost, firestorePort] = firestoreEmulatorHost.split(':');
  const [storageHost, storagePort] = storageEmulatorHost.split(':');

  connectAuthEmulator(auth, `http://${authHost}:${authPort}`, { disableWarnings: true });
  connectFirestoreEmulator(db, firestoreHost, parseInt(firestorePort));
  connectStorageEmulator(storage, storageHost, parseInt(storagePort));

  console.log('Firebase Client SDK connected to emulators');
}

export default app;
