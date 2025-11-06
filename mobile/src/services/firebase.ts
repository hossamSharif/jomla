/**
 * Firebase SDK Initialization for Mobile App
 *
 * Initializes Firebase services with emulator detection for local development.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase app (only once)
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions: Functions = getFunctions(app);

// Connect to emulators in development
const USE_EMULATOR = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
const ENVIRONMENT = process.env.EXPO_PUBLIC_ENVIRONMENT || 'production';

if (USE_EMULATOR && ENVIRONMENT === 'development') {
  const firestoreHost = process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST || 'localhost:8080';
  const authHost = process.env.EXPO_PUBLIC_AUTH_EMULATOR_HOST || 'localhost:9099';
  const storageHost = process.env.EXPO_PUBLIC_STORAGE_EMULATOR_HOST || 'localhost:9199';

  // Parse host and port
  const [firestoreHostname, firestorePort] = firestoreHost.split(':');
  const [authHostname, authPort] = authHost.split(':');
  const [storageHostname, storagePort] = storageHost.split(':');

  // Connect to Firestore emulator
  try {
    connectFirestoreEmulator(db, firestoreHostname, parseInt(firestorePort, 10));
    console.log('Connected to Firestore Emulator');
  } catch (error) {
    console.warn('Firestore Emulator already connected or failed:', error);
  }

  // Connect to Auth emulator
  try {
    connectAuthEmulator(auth, `http://${authHostname}:${authPort}`, {
      disableWarnings: true,
    });
    console.log('Connected to Auth Emulator');
  } catch (error) {
    console.warn('Auth Emulator already connected or failed:', error);
  }

  // Connect to Storage emulator
  try {
    connectStorageEmulator(storage, storageHostname, parseInt(storagePort, 10));
    console.log('Connected to Storage Emulator');
  } catch (error) {
    console.warn('Storage Emulator already connected or failed:', error);
  }

  // Connect to Functions emulator
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
    console.log('Connected to Functions Emulator');
  } catch (error) {
    console.warn('Functions Emulator already connected or failed:', error);
  }
}

export default app;
