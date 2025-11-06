/**
 * cleanupExpiredVerificationCodes Scheduled Cloud Function
 *
 * Runs every hour to clean up expired verification codes from user documents.
 * This maintains database hygiene and prevents stale verification data from
 * accumulating in the users collection.
 *
 * Scheduled via Pub/Sub: runs at minute 0 of every hour (cron: 0 * * * *)
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Cleanup expired verification codes from user documents
 *
 * This function:
 * 1. Queries all users with expired verification codes
 * 2. Removes verificationCodeHash and verificationCodeExpiry fields
 * 3. Logs cleanup statistics for monitoring
 *
 * Performance:
 * - Processes up to 500 documents per run (Firestore batch limit)
 * - Uses batch writes for efficiency
 * - Runs every hour to prevent backlog
 */
export const cleanupExpiredVerificationCodes = functions.pubsub
  .schedule('0 * * * *') // Run at minute 0 of every hour
  .timeZone('UTC')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    try {
      functions.logger.info('Starting cleanup of expired verification codes', {
        timestamp: now.toDate().toISOString(),
      });

      // Query users with expired verification codes
      // Note: We need to query all users and filter in-memory because
      // Firestore doesn't support < comparison on undefined fields
      const usersSnapshot = await db
        .collection('users')
        .where('verificationCodeExpiry', '<=', now)
        .limit(500) // Process max 500 per run to stay within limits
        .get();

      if (usersSnapshot.empty) {
        functions.logger.info('No expired verification codes found');
        return {
          success: true,
          cleaned: 0,
          message: 'No expired codes to clean',
        };
      }

      // Batch cleanup for efficiency
      const batch = db.batch();
      let cleanedCount = 0;

      usersSnapshot.forEach((doc) => {
        const data = doc.data();

        // Double-check expiry (defensive programming)
        if (
          data.verificationCodeExpiry &&
          data.verificationCodeExpiry.toMillis() <= now.toMillis()
        ) {
          batch.update(doc.ref, {
            verificationCodeHash: admin.firestore.FieldValue.delete(),
            verificationCodeExpiry: admin.firestore.FieldValue.delete(),
            updatedAt: now,
          });
          cleanedCount++;
        }
      });

      // Commit batch
      if (cleanedCount > 0) {
        await batch.commit();
        functions.logger.info('Successfully cleaned up expired verification codes', {
          cleaned: cleanedCount,
          timestamp: now.toDate().toISOString(),
        });
      }

      return {
        success: true,
        cleaned: cleanedCount,
        message: `Cleaned ${cleanedCount} expired verification codes`,
      };
    } catch (error: any) {
      functions.logger.error('Error cleaning up expired verification codes', {
        error: error.message,
        stack: error.stack,
        timestamp: now.toDate().toISOString(),
      });

      // Return error details for monitoring
      return {
        success: false,
        cleaned: 0,
        error: error.message,
      };
    }
  });
