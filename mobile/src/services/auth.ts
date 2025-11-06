/**
 * Firebase Authentication Helper Functions
 *
 * Provides authentication utilities for the mobile app.
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
  UserCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { useAuthStore } from '../store';
import type { User } from '../../../shared/types/user';

/**
 * Sign in with email and password
 */
export async function signIn(
  email: string,
  password: string
): Promise<FirebaseUser> {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Update last login timestamp
    await updateLastLogin(userCredential.user.uid);

    return userCredential.user;
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw new Error(error.message || 'Failed to sign in');
  }
}

/**
 * Sign up with email and password
 */
export async function signUp(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  phoneNumber: string
): Promise<FirebaseUser> {
  try {
    // Create Firebase Auth user
    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const uid = userCredential.user.uid;

    // Update profile with display name
    await updateProfile(userCredential.user, {
      displayName: `${firstName} ${lastName}`,
    });

    // Create user document in Firestore
    const userDoc: Omit<User, 'createdAt' | 'updatedAt'> & {
      createdAt: any;
      updatedAt: any;
    } = {
      uid,
      email,
      phoneNumber,
      firstName,
      lastName,
      isPhoneVerified: false,
      verificationAttempts: 0,
      fcmTokens: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await setDoc(doc(db, 'users', uid), userDoc);

    return userCredential.user;
  } catch (error: any) {
    console.error('Sign up error:', error);
    throw new Error(error.message || 'Failed to create account');
  }
}

/**
 * Sign out
 */
export async function logout(): Promise<void> {
  try {
    await signOut(auth);
    useAuthStore.getState().logout();
  } catch (error: any) {
    console.error('Sign out error:', error);
    throw new Error(error.message || 'Failed to sign out');
  }
}

/**
 * Send password reset email
 */
export async function resetPasswordEmail(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('Password reset error:', error);
    throw new Error(error.message || 'Failed to send password reset email');
  }
}

/**
 * Update user password
 */
export async function changePassword(newPassword: string): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    await updatePassword(user, newPassword);
  } catch (error: any) {
    console.error('Change password error:', error);
    throw new Error(error.message || 'Failed to change password');
  }
}

/**
 * Get current user document from Firestore
 */
export async function getCurrentUserDoc(): Promise<User | null> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      return null;
    }

    return userDoc.data() as User;
  } catch (error: any) {
    console.error('Get user document error:', error);
    return null;
  }
}

/**
 * Update last login timestamp
 */
async function updateLastLogin(uid: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      lastLoginAt: Timestamp.now(),
      sessionExpiresAt: Timestamp.fromDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      ),
      updatedAt: Timestamp.now(),
    });
  } catch (error: any) {
    console.error('Update last login error:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  uid: string,
  data: {
    firstName?: string;
    lastName?: string;
  }
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });

    // Update Firebase Auth display name if firstName or lastName changed
    if (data.firstName || data.lastName) {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          await updateProfile(user, {
            displayName: `${userData.firstName} ${userData.lastName}`,
          });
        }
      }
    }
  } catch (error: any) {
    console.error('Update user profile error:', error);
    throw new Error(error.message || 'Failed to update profile');
  }
}

/**
 * Register FCM token for push notifications
 */
export async function registerFCMToken(
  uid: string,
  token: string
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data() as User;
      const fcmTokens = userData.fcmTokens || [];

      // Add token if not already present
      if (!fcmTokens.includes(token)) {
        fcmTokens.push(token);
        await updateDoc(userRef, {
          fcmTokens,
          updatedAt: Timestamp.now(),
        });
      }
    }
  } catch (error: any) {
    console.error('Register FCM token error:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Unregister FCM token
 */
export async function unregisterFCMToken(
  uid: string,
  token: string
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data() as User;
      const fcmTokens = (userData.fcmTokens || []).filter(t => t !== token);

      await updateDoc(userRef, {
        fcmTokens,
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error: any) {
    console.error('Unregister FCM token error:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Setup auth state listener
 */
export function setupAuthListener(): () => void {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // User is signed in
      const userDoc = await getCurrentUserDoc();
      if (userDoc) {
        useAuthStore.getState().setUser(userDoc);
      }
    } else {
      // User is signed out
      useAuthStore.getState().setUser(null);
    }

    useAuthStore.getState().setLoading(false);
  });
}

/**
 * Get current Firebase user
 */
export function getCurrentFirebaseUser(): FirebaseUser | null {
  return auth.currentUser;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!auth.currentUser;
}
