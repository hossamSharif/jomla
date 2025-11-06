/**
 * verifyCode Cloud Function
 *
 * Verifies an SMS code for account activation or password reset.
 * Returns a custom token for registration or success flag for password reset.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

interface VerifyCodeRequest {
  phoneNumber: string;
  code: string;
  type: 'registration' | 'password_reset';
}

interface VerifyCodeResponse {
  success: boolean;
  customToken?: string;
  resetToken?: string;
}

/**
 * Hashes verification code for comparison
 */
function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Generates a temporary reset token
 */
function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export const verifyCode = functions.https.onCall(
  async (
    data: VerifyCodeRequest,
    context
  ): Promise<VerifyCodeResponse> => {
    const { phoneNumber, code, type } = data;

    // Validate input
    if (!phoneNumber || !code || !type) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Phone number, code, and type are required'
      );
    }

    if (!/^\d{6}$/.test(code)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Verification code must be a 6-digit number'
      );
    }

    if (type !== 'registration' && type !== 'password_reset') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Type must be either "registration" or "password_reset"'
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
          'No pending verification found for this phone number'
        );
      }

      const userDoc = usersQuery.docs[0];
      const userId = userDoc.id;
      const userData = userDoc.data();

      // Check if verification code exists
      if (!userData.verificationCodeHash) {
        throw new functions.https.HttpsError(
          'not-found',
          'No pending verification found. Please request a new code.'
        );
      }

      // Check if code has expired
      const now = admin.firestore.Timestamp.now();
      const expiry = userData.verificationCodeExpiry;

      if (!expiry || expiry.toMillis() < now.toMillis()) {
        // Clear expired code
        await db.collection('users').doc(userId).update({
          verificationCodeHash: admin.firestore.FieldValue.delete(),
          verificationCodeExpiry: admin.firestore.FieldValue.delete(),
          updatedAt: now,
        });

        throw new functions.https.HttpsError(
          'deadline-exceeded',
          'Verification code has expired. Please request a new code.'
        );
      }

      // Verify code matches
      const codeHash = hashCode(code);
      if (codeHash !== userData.verificationCodeHash) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Invalid verification code. Please check and try again.'
        );
      }

      // Code is valid - proceed based on type
      if (type === 'registration') {
        // Mark phone as verified
        await db.collection('users').doc(userId).update({
          isPhoneVerified: true,
          verificationCodeHash: admin.firestore.FieldValue.delete(),
          verificationCodeExpiry: admin.firestore.FieldValue.delete(),
          verificationAttempts: 0,
          updatedAt: now,
        });

        // Generate custom authentication token
        const customToken = await admin.auth().createCustomToken(userId, {
          phoneNumber,
          phoneVerified: true,
        });

        functions.logger.info('User phone verified (registration)', {
          userId,
          phoneNumber,
        });

        return {
          success: true,
          customToken,
        };
      } else {
        // password_reset
        // Generate temporary reset token
        const resetToken = generateResetToken();
        const resetTokenExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        await db.collection('users').doc(userId).update({
          resetToken,
          resetTokenExpiry: admin.firestore.Timestamp.fromDate(resetTokenExpiry),
          verificationCodeHash: admin.firestore.FieldValue.delete(),
          verificationCodeExpiry: admin.firestore.FieldValue.delete(),
          verificationAttempts: 0,
          updatedAt: now,
        });

        functions.logger.info('Password reset code verified', {
          userId,
          phoneNumber,
        });

        return {
          success: true,
          resetToken,
        };
      }
    } catch (error: any) {
      // Re-throw HttpsError as-is
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Log unexpected errors
      functions.logger.error('Unexpected error in verifyCode', {
        error,
        phoneNumber,
        type,
      });

      throw new functions.https.HttpsError(
        'internal',
        'An unexpected error occurred. Please try again later.'
      );
    }
  }
);
