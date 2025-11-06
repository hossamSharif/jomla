/**
 * Cloud Function: createAdminUser
 *
 * Creates a new admin user account with role-based permissions
 * and sets custom claims for Firebase Auth.
 *
 * Only super admins can create new admin users.
 */

import * as functions from 'firebase-functions';
import { auth, db, getTimestamp } from '../config/firebase-admin';

/**
 * Request body interface
 */
interface CreateAdminUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'admin' | 'viewer';
}

/**
 * Response interface
 */
interface CreateAdminUserResponse {
  success: boolean;
  adminId?: string;
  message: string;
}

/**
 * Role-based permissions mapping
 */
const rolePermissions: Record<string, {
  manageProducts: boolean;
  manageOffers: boolean;
  manageOrders: boolean;
  manageAdmins: boolean;
}> = {
  super_admin: {
    manageProducts: true,
    manageOffers: true,
    manageOrders: true,
    manageAdmins: true,
  },
  admin: {
    manageProducts: true,
    manageOffers: true,
    manageOrders: true,
    manageAdmins: false,
  },
  viewer: {
    manageProducts: false,
    manageOffers: false,
    manageOrders: false,
    manageAdmins: false,
  },
};

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Password must be at least 8 characters
 */
function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

/**
 * HTTP Callable Function: createAdminUser
 */
export const createAdminUser = functions.https.onCall(
  async (data: CreateAdminUserRequest, context): Promise<CreateAdminUserResponse> => {
    try {
      // Authentication check
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User must be authenticated to create admin users'
        );
      }

      const callerUid = context.auth.uid;

      // Verify caller is a super admin
      const callerDoc = await db.collection('adminUsers').doc(callerUid).get();

      if (!callerDoc.exists) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Only admin users can create new admin accounts'
        );
      }

      const callerData = callerDoc.data();
      if (callerData?.role !== 'super_admin') {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Only super admins can create new admin users'
        );
      }

      // Validate request data
      const { email, password, firstName, lastName, role } = data;

      if (!email || !password || !firstName || !lastName || !role) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Missing required fields: email, password, firstName, lastName, role'
        );
      }

      // Validate email format
      if (!isValidEmail(email)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Invalid email format'
        );
      }

      // Validate password strength
      if (!isValidPassword(password)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Password must be at least 8 characters long'
        );
      }

      // Validate role
      if (!['super_admin', 'admin', 'viewer'].includes(role)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Invalid role. Must be one of: super_admin, admin, viewer'
        );
      }

      // Check if email already exists
      try {
        const existingUser = await auth.getUserByEmail(email);
        if (existingUser) {
          throw new functions.https.HttpsError(
            'already-exists',
            'An account with this email already exists'
          );
        }
      } catch (error: any) {
        // If error is not 'user not found', rethrow
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
        // Otherwise, email doesn't exist, which is what we want
      }

      // Create Firebase Auth user
      const userRecord = await auth.createUser({
        email,
        password,
        emailVerified: true, // Admin accounts are pre-verified
        disabled: false,
      });

      // Set custom claims for admin access
      await auth.setCustomUserClaims(userRecord.uid, {
        admin: true,
        role,
      });

      // Get permissions for the role
      const permissions = rolePermissions[role];

      // Create admin user document in Firestore
      const adminUserData = {
        uid: userRecord.uid,
        email,
        firstName,
        lastName,
        role,
        permissions,
        isActive: true,
        createdAt: getTimestamp(),
        lastLoginAt: null,
      };

      await db.collection('adminUsers').doc(userRecord.uid).set(adminUserData);

      console.log(`Admin user created successfully: ${userRecord.uid} (${email})`);

      return {
        success: true,
        adminId: userRecord.uid,
        message: `Admin user ${email} created successfully with role: ${role}`,
      };

    } catch (error: any) {
      console.error('Error creating admin user:', error);

      // Re-throw HttpsErrors as-is
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Handle Firebase Auth errors
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-exists':
            throw new functions.https.HttpsError(
              'already-exists',
              'An account with this email already exists'
            );
          case 'auth/invalid-email':
            throw new functions.https.HttpsError(
              'invalid-argument',
              'Invalid email format'
            );
          case 'auth/weak-password':
            throw new functions.https.HttpsError(
              'invalid-argument',
              'Password is too weak'
            );
          default:
            throw new functions.https.HttpsError(
              'internal',
              `Firebase Auth error: ${error.message}`
            );
        }
      }

      // Generic error
      throw new functions.https.HttpsError(
        'internal',
        'Failed to create admin user. Please try again.'
      );
    }
  }
);
