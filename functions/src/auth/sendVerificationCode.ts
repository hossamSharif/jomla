/**
 * sendVerificationCode Cloud Function
 *
 * Sends an SMS verification code for account confirmation or password reset.
 * Uses Twilio Verify API for code generation and delivery.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

// Twilio client (initialized lazily)
let twilioClient: any;

function getTwilioClient() {
  if (!twilioClient) {
    const twilio = require('twilio');
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Twilio credentials not configured'
      );
    }

    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

interface SendVerificationCodeRequest {
  phoneNumber: string;
  type: 'registration' | 'password_reset';
}

interface SendVerificationCodeResponse {
  success: boolean;
  expiresAt: number;
  attemptsRemaining: number;
}

/**
 * Validates E.164 phone number format
 */
function isValidPhoneNumber(phoneNumber: string): boolean {
  // E.164 format: +[country code][number]
  // Example: +12025551234
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

/**
 * Generates a 6-digit verification code
 */
function generateVerificationCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Hashes verification code for storage
 */
function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export const sendVerificationCode = functions.https.onCall(
  async (
    data: SendVerificationCodeRequest,
    context
  ): Promise<SendVerificationCodeResponse> => {
    const { phoneNumber, type } = data;

    // Validate input
    if (!phoneNumber || !type) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Phone number and type are required'
      );
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid phone number format. Use E.164 format (e.g., +12025551234)'
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
      // For password reset, verify user exists
      if (type === 'password_reset') {
        const usersSnapshot = await db
          .collection('users')
          .where('phoneNumber', '==', phoneNumber)
          .limit(1)
          .get();

        if (usersSnapshot.empty) {
          throw new functions.https.HttpsError(
            'not-found',
            'No account found with this phone number'
          );
        }
      }

      // Check for existing user document (by phone number)
      const usersQuery = await db
        .collection('users')
        .where('phoneNumber', '==', phoneNumber)
        .limit(1)
        .get();

      let userDoc: FirebaseFirestore.DocumentSnapshot;
      let userId: string;

      if (!usersQuery.empty) {
        userDoc = usersQuery.docs[0];
        userId = userDoc.id;

        // Check rate limiting
        const userData = userDoc.data();
        if (userData) {
          const now = admin.firestore.Timestamp.now();
          const lastRequest = userData.lastVerificationRequest;
          const attempts = userData.verificationAttempts || 0;

          // Reset attempts if more than 1 hour has passed
          if (lastRequest) {
            const hourAgo = new Date(now.toMillis() - 60 * 60 * 1000);
            const lastRequestDate = lastRequest.toDate();

            if (lastRequestDate < hourAgo) {
              // Reset attempts counter
              await db.collection('users').doc(userId).update({
                verificationAttempts: 0,
                lastVerificationRequest: now,
              });
            } else if (attempts >= 3) {
              throw new functions.https.HttpsError(
                'failed-precondition',
                'Too many verification attempts. Please try again in 1 hour.'
              );
            }
          }
        }
      } else if (type === 'registration') {
        // Create placeholder user document for registration
        const newUserRef = db.collection('users').doc();
        userId = newUserRef.id;

        await newUserRef.set({
          uid: userId,
          phoneNumber,
          isPhoneVerified: false,
          verificationAttempts: 0,
          lastVerificationRequest: admin.firestore.Timestamp.now(),
          fcmTokens: [],
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });

        userDoc = await newUserRef.get();
      } else {
        throw new functions.https.HttpsError(
          'not-found',
          'User not found'
        );
      }

      // Generate verification code
      const code = generateVerificationCode();
      const codeHash = hashCode(code);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // Update user document with verification code
      const userData = userDoc.data();
      const currentAttempts = userData?.verificationAttempts || 0;

      await db.collection('users').doc(userId).update({
        verificationCodeHash: codeHash,
        verificationCodeExpiry: admin.firestore.Timestamp.fromDate(expiresAt),
        verificationAttempts: currentAttempts + 1,
        lastVerificationRequest: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // Send SMS via Twilio
      try {
        const twilioVerifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

        if (twilioVerifyServiceSid) {
          // Use Twilio Verify API
          const client = getTwilioClient();
          await client.verify.v2
            .services(twilioVerifyServiceSid)
            .verifications.create({
              to: phoneNumber,
              channel: 'sms',
            });
        } else {
          // Fallback to direct SMS (for testing)
          const client = getTwilioClient();
          const message = type === 'registration'
            ? `Your verification code is: ${code}. Valid for 30 minutes.`
            : `Your password reset code is: ${code}. Valid for 30 minutes.`;

          await client.messages.create({
            body: message,
            to: phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER,
          });
        }

        functions.logger.info('Verification code sent', {
          phoneNumber,
          type,
          userId,
        });
      } catch (smsError) {
        functions.logger.error('Failed to send SMS', {
          error: smsError,
          phoneNumber,
        });
        throw new functions.https.HttpsError(
          'unavailable',
          'Failed to send verification code. Please try again later.'
        );
      }

      return {
        success: true,
        expiresAt: expiresAt.getTime(),
        attemptsRemaining: Math.max(0, 3 - (currentAttempts + 1)),
      };
    } catch (error: any) {
      // Re-throw HttpsError as-is
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Log unexpected errors
      functions.logger.error('Unexpected error in sendVerificationCode', {
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
