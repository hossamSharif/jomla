/**
 * User Firestore Service
 *
 * Provides CRUD operations for user documents in Firestore.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import type { User } from '../../../shared/types/user';

/**
 * Create a new user document
 */
export async function createUser(
  uid: string,
  data: {
    email: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
  }
): Promise<User> {
  try {
    const userDoc: Omit<User, 'createdAt' | 'updatedAt'> & {
      createdAt: any;
      updatedAt: any;
    } = {
      uid,
      email: data.email,
      phoneNumber: data.phoneNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      isPhoneVerified: false,
      verificationAttempts: 0,
      fcmTokens: [],
      notificationPreferences: {
        enableOfferNotifications: true,
        enableOrderNotifications: true,
        enableCartNotifications: true,
        enablePromotionalNotifications: true,
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, userDoc);

    return {
      ...userDoc,
      createdAt: userDoc.createdAt as Timestamp,
      updatedAt: userDoc.updatedAt as Timestamp,
    };
  } catch (error: any) {
    console.error('Create user error:', error);
    throw new Error(error.message || 'Failed to create user document');
  }
}

/**
 * Get user document by UID
 */
export async function getUser(uid: string): Promise<User | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    return userSnap.data() as User;
  } catch (error: any) {
    console.error('Get user error:', error);
    throw new Error(error.message || 'Failed to get user document');
  }
}

/**
 * Get user document by phone number
 */
export async function getUserByPhoneNumber(
  phoneNumber: string
): Promise<User | null> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    return querySnapshot.docs[0].data() as User;
  } catch (error: any) {
    console.error('Get user by phone number error:', error);
    throw new Error(error.message || 'Failed to get user by phone number');
  }
}

/**
 * Get user document by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    return querySnapshot.docs[0].data() as User;
  } catch (error: any) {
    console.error('Get user by email error:', error);
    throw new Error(error.message || 'Failed to get user by email');
  }
}

/**
 * Update user document
 */
export async function updateUser(
  uid: string,
  data: Partial<
    Omit<User, 'uid' | 'createdAt' | 'updatedAt' | 'email' | 'phoneNumber'>
  >
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);

    await updateDoc(userRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    throw new Error(error.message || 'Failed to update user document');
  }
}

/**
 * Mark phone as verified
 */
export async function markPhoneVerified(uid: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);

    await updateDoc(userRef, {
      isPhoneVerified: true,
      verificationAttempts: 0,
      verificationCodeHash: null,
      verificationCodeExpiry: null,
      updatedAt: Timestamp.now(),
    });
  } catch (error: any) {
    console.error('Mark phone verified error:', error);
    throw new Error(error.message || 'Failed to mark phone as verified');
  }
}

/**
 * Add FCM token to user document
 */
export async function addFCMToken(uid: string, token: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User document not found');
    }

    const userData = userSnap.data() as User;
    const fcmTokens = userData.fcmTokens || [];

    // Add token if not already present
    if (!fcmTokens.includes(token)) {
      fcmTokens.push(token);

      await updateDoc(userRef, {
        fcmTokens,
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error: any) {
    console.error('Add FCM token error:', error);
    throw new Error(error.message || 'Failed to add FCM token');
  }
}

/**
 * Remove FCM token from user document
 */
export async function removeFCMToken(
  uid: string,
  token: string
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User document not found');
    }

    const userData = userSnap.data() as User;
    const fcmTokens = (userData.fcmTokens || []).filter((t) => t !== token);

    await updateDoc(userRef, {
      fcmTokens,
      updatedAt: Timestamp.now(),
    });
  } catch (error: any) {
    console.error('Remove FCM token error:', error);
    throw new Error(error.message || 'Failed to remove FCM token');
  }
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(uid: string): Promise<void> {
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
 * Update user profile fields
 */
export async function updateProfile(
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
  } catch (error: any) {
    console.error('Update profile error:', error);
    throw new Error(error.message || 'Failed to update profile');
  }
}

/**
 * Check if phone number is already registered
 */
export async function isPhoneNumberRegistered(
  phoneNumber: string
): Promise<boolean> {
  try {
    const user = await getUserByPhoneNumber(phoneNumber);
    return !!user;
  } catch (error: any) {
    console.error('Check phone number error:', error);
    return false;
  }
}

/**
 * Check if email is already registered
 */
export async function isEmailRegistered(email: string): Promise<boolean> {
  try {
    const user = await getUserByEmail(email);
    return !!user;
  } catch (error: any) {
    console.error('Check email error:', error);
    return false;
  }
}

/**
 * Get user's verification attempts count
 */
export async function getVerificationAttempts(uid: string): Promise<number> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return 0;
    }

    const userData = userSnap.data() as User;
    return userData.verificationAttempts || 0;
  } catch (error: any) {
    console.error('Get verification attempts error:', error);
    return 0;
  }
}

/**
 * Reset verification attempts counter
 */
export async function resetVerificationAttempts(uid: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);

    await updateDoc(userRef, {
      verificationAttempts: 0,
      lastVerificationRequest: null,
      updatedAt: Timestamp.now(),
    });
  } catch (error: any) {
    console.error('Reset verification attempts error:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Update notification preferences for a user
 */
export async function updateNotificationPreferences(
  uid: string,
  preferences: Partial<{
    enableOfferNotifications: boolean;
    enableOrderNotifications: boolean;
    enableCartNotifications: boolean;
    enablePromotionalNotifications: boolean;
  }>
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);

    await updateDoc(userRef, {
      'notificationPreferences.enableOfferNotifications':
        preferences.enableOfferNotifications,
      'notificationPreferences.enableOrderNotifications':
        preferences.enableOrderNotifications,
      'notificationPreferences.enableCartNotifications':
        preferences.enableCartNotifications,
      'notificationPreferences.enablePromotionalNotifications':
        preferences.enablePromotionalNotifications,
      updatedAt: Timestamp.now(),
    });

    console.log('Notification preferences updated successfully');
  } catch (error: any) {
    console.error('Update notification preferences error:', error);
    throw new Error(error.message || 'Failed to update notification preferences');
  }
}

/**
 * Get notification preferences for a user
 */
export async function getNotificationPreferences(uid: string): Promise<{
  enableOfferNotifications: boolean;
  enableOrderNotifications: boolean;
  enableCartNotifications: boolean;
  enablePromotionalNotifications: boolean;
} | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    const userData = userSnap.data() as User;
    return userData.notificationPreferences || {
      enableOfferNotifications: true,
      enableOrderNotifications: true,
      enableCartNotifications: true,
      enablePromotionalNotifications: true,
    };
  } catch (error: any) {
    console.error('Get notification preferences error:', error);
    throw new Error(error.message || 'Failed to get notification preferences');
  }
}
