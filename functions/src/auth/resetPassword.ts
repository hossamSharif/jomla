/**
 * resetPassword Cloud Function
 *
 * Resets user password after successful SMS verification.
 * Requires a valid reset token from the verifyCode function.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface ResetPasswordRequest {
  phoneNumber: string;
  newPassword: string;
  verificationToken: string;
}

interface ResetPasswordResponse {
  success: boolean;
}

/**
 * Validates password strength
 */
function isValidPassword(password: string): boolean {
  // Minimum 8 characters
  return password.length >= 8;
}

export const resetPassword = functions.https.onCall(
  async (
    data: ResetPasswordRequest,
    context
  ): Promise<ResetPasswordResponse> => {
    const { phoneNumber, newPassword, verificationToken } = data;

    // Validate input
    if (!phoneNumber || !newPassword || !verificationToken) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Phone number, new password, and verification token are required'
      );
    }

    if (!isValidPassword(newPassword)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Password must be at least 8 characters long'
      );
    }

    const db = admin.firestore();

    try {
      // Find user by phone number
      const usersQuery = await db
        .collection('users')
        .where('phoneNumber', '==', phoneNumber)
        .limit(1)
        .get();

      if (usersQuery.empty) {
        throw new functions.https.HttpsError(
          'not-found',
          'User not found'
        );
      }

      const userDoc = usersQuery.docs[0];
      const userId = userDoc.id;
      const userData = userDoc.data();

      // Verify reset token exists
      if (!userData.resetToken) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Invalid or expired verification token'
        );
      }

      // Check if token has expired
      const now = admin.firestore.Timestamp.now();
      const tokenExpiry = userData.resetTokenExpiry;

      if (!tokenExpiry || tokenExpiry.toMillis() < now.toMillis()) {
        // Clear expired token
        await db.collection('users').doc(userId).update({
          resetToken: admin.firestore.FieldValue.delete(),
          resetTokenExpiry: admin.firestore.FieldValue.delete(),
          updatedAt: now,
        });

        throw new functions.https.HttpsError(
          'deadline-exceeded',
          'Verification token has expired. Please request a new verification code.'
        );
      }

      // Verify token matches
      if (verificationToken !== userData.resetToken) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Invalid verification token'
        );
      }

      // Get Firebase Auth user
      let firebaseUser;
      try {
        // Try to get user by phone number
        const userRecords = await admin.auth().getUserByPhoneNumber(phoneNumber);
        firebaseUser = userRecords;
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found') {
          // If user doesn't exist in Auth, get by email from Firestore
          if (userData.email) {
            try {
              firebaseUser = await admin.auth().getUserByEmail(userData.email);
            } catch (emailError: any) {
              throw new functions.https.HttpsError(
                'not-found',
                'Firebase Auth user not found'
              );
            }
          } else {
            throw new functions.https.HttpsError(
              'not-found',
              'User authentication record not found'
            );
          }
        } else {
          throw authError;
        }
      }

      // Update password in Firebase Auth
      await admin.auth().updateUser(firebaseUser.uid, {
        password: newPassword,
      });

      // Clear reset token and update timestamp
      await db.collection('users').doc(userId).update({
        resetToken: admin.firestore.FieldValue.delete(),
        resetTokenExpiry: admin.firestore.FieldValue.delete(),
        updatedAt: now,
      });

      functions.logger.info('Password reset successfully', {
        userId,
        phoneNumber,
      });

      return {
        success: true,
      };
    } catch (error: any) {
      // Re-throw HttpsError as-is
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Log unexpected errors
      functions.logger.error('Unexpected error in resetPassword', {
        error,
        phoneNumber,
      });

      throw new functions.https.HttpsError(
        'internal',
        'An unexpected error occurred. Please try again later.'
      );
    }
  }
);
