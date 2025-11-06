/**
 * Admin Authentication Library
 *
 * Client-side authentication helpers for admin dashboard
 */

import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';
import { auth } from './firebase-client';

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get ID token to check custom claims
    const idTokenResult = await user.getIdTokenResult();

    // Verify user has admin claim
    if (!idTokenResult.claims.admin) {
      await firebaseSignOut(auth);
      throw new Error('Access denied. Admin privileges required.');
    }

    return user;
  } catch (error: any) {
    console.error('Sign in error:', error);

    // Provide user-friendly error messages
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email address.');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Incorrect password. Please try again.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address format.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed attempts. Please try again later.');
    } else if (error.message) {
      throw error;
    } else {
      throw new Error('Failed to sign in. Please try again.');
    }
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw new Error('Failed to sign out. Please try again.');
  }
}

/**
 * Get current authenticated user
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const user = getCurrentUser();
  if (!user) return false;

  try {
    const idTokenResult = await user.getIdTokenResult();
    return idTokenResult.claims.admin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Refresh user token to get latest claims
 */
export async function refreshUserToken(): Promise<void> {
  const user = getCurrentUser();
  if (!user) throw new Error('No user signed in');

  try {
    await user.getIdToken(true); // Force refresh
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw new Error('Failed to refresh authentication token.');
  }
}

/**
 * Get user ID token for API requests
 */
export async function getUserIdToken(): Promise<string> {
  const user = getCurrentUser();
  if (!user) throw new Error('No user signed in');

  try {
    return await user.getIdToken();
  } catch (error) {
    console.error('Error getting ID token:', error);
    throw new Error('Failed to get authentication token.');
  }
}
