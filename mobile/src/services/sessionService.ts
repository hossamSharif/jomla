/**
 * Session Management Service
 *
 * Handles session validation and renewal with 30-day sliding expiration.
 */

import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { useAuthStore } from '../store';
import type { User } from '../../../shared/types/user';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

/**
 * Check if user session is valid
 * @returns true if session is valid, false if expired
 */
export async function isSessionValid(uid: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return false;
    }

    const userData = userSnap.data() as User;
    const sessionExpiresAt = userData.sessionExpiresAt;

    if (!sessionExpiresAt) {
      // No session expiry set, create one
      await renewSession(uid);
      return true;
    }

    const now = new Date();
    const expiryDate = sessionExpiresAt.toDate();

    // Check if session has expired
    if (expiryDate < now) {
      return false;
    }

    return true;
  } catch (error: any) {
    console.error('Session validation error:', error);
    return false;
  }
}

/**
 * Renew user session (extends expiry by 30 days from now)
 */
export async function renewSession(uid: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const newExpiryDate = new Date(Date.now() + SESSION_DURATION_MS);

    await updateDoc(userRef, {
      sessionExpiresAt: Timestamp.fromDate(newExpiryDate),
      lastLoginAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log('Session renewed until:', newExpiryDate);
  } catch (error: any) {
    console.error('Session renewal error:', error);
    throw new Error(error.message || 'Failed to renew session');
  }
}

/**
 * Validate and renew session if needed
 * @returns true if session is valid or renewed, false if expired
 */
export async function validateAndRenewSession(uid: string): Promise<boolean> {
  try {
    const isValid = await isSessionValid(uid);

    if (!isValid) {
      // Session expired, logout user
      await handleExpiredSession();
      return false;
    }

    // Session is valid, check if we should renew it
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data() as User;
      const sessionExpiresAt = userData.sessionExpiresAt;

      if (sessionExpiresAt) {
        const expiryDate = sessionExpiresAt.toDate();
        const now = new Date();
        const timeUntilExpiry = expiryDate.getTime() - now.getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;

        // Renew session if less than 1 day remaining
        if (timeUntilExpiry < oneDayMs) {
          await renewSession(uid);
        }
      }
    }

    return true;
  } catch (error: any) {
    console.error('Session validation and renewal error:', error);
    return false;
  }
}

/**
 * Handle expired session (logout user)
 */
export async function handleExpiredSession(): Promise<void> {
  try {
    // Clear auth state
    useAuthStore.getState().logout();

    // Sign out from Firebase Auth
    if (auth.currentUser) {
      await auth.signOut();
    }

    console.log('Session expired - user logged out');
  } catch (error: any) {
    console.error('Handle expired session error:', error);
  }
}

/**
 * Get session expiry date for current user
 */
export async function getSessionExpiry(uid: string): Promise<Date | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    const userData = userSnap.data() as User;
    const sessionExpiresAt = userData.sessionExpiresAt;

    if (!sessionExpiresAt) {
      return null;
    }

    return sessionExpiresAt.toDate();
  } catch (error: any) {
    console.error('Get session expiry error:', error);
    return null;
  }
}

/**
 * Get time remaining until session expiry
 * @returns milliseconds until expiry, or null if no session
 */
export async function getSessionTimeRemaining(uid: string): Promise<number | null> {
  try {
    const expiryDate = await getSessionExpiry(uid);

    if (!expiryDate) {
      return null;
    }

    const now = new Date();
    const timeRemaining = expiryDate.getTime() - now.getTime();

    return timeRemaining > 0 ? timeRemaining : 0;
  } catch (error: any) {
    console.error('Get session time remaining error:', error);
    return null;
  }
}

/**
 * Initialize session monitoring
 * Checks session validity periodically and renews as needed
 */
export function initializeSessionMonitoring(uid: string): () => void {
  // Check session every 1 hour
  const intervalId = setInterval(async () => {
    await validateAndRenewSession(uid);
  }, 60 * 60 * 1000); // 1 hour

  // Initial check
  validateAndRenewSession(uid);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
  };
}

/**
 * Manually end session (logout)
 */
export async function endSession(uid: string): Promise<void> {
  try {
    // Clear session expiry
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      sessionExpiresAt: null,
      updatedAt: Timestamp.now(),
    });

    // Logout
    await handleExpiredSession();
  } catch (error: any) {
    console.error('End session error:', error);
    throw new Error(error.message || 'Failed to end session');
  }
}

/**
 * Create new session on login
 */
export async function createSession(uid: string): Promise<void> {
  try {
    await renewSession(uid);
    console.log('New session created for user:', uid);
  } catch (error: any) {
    console.error('Create session error:', error);
    throw new Error(error.message || 'Failed to create session');
  }
}
