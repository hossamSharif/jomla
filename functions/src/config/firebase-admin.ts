/**
 * Firebase Admin SDK Initialization for Cloud Functions
 *
 * Initializes Firebase Admin SDK for use in Cloud Functions.
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK only once
if (!admin.apps.length) {
  // Cloud Functions automatically have access to service account credentials
  // No need to explicitly pass credentials in the Functions environment
  admin.initializeApp();
  console.log('Firebase Admin SDK initialized in Cloud Functions');
}

// Export Firebase Admin services
export const auth = admin.auth();
export const db = admin.firestore();
export const storage = admin.storage();
export const messaging = admin.messaging();

// Export admin SDK instance
export default admin;

// Helper functions

/**
 * Verify Firebase ID token and return decoded token
 */
export async function verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
  try {
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Check if user is an admin
 */
export async function isAdmin(uid: string): Promise<boolean> {
  try {
    const user = await auth.getUser(uid);
    return user.customClaims?.admin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Set custom claims for a user
 */
export async function setCustomClaims(uid: string, claims: Record<string, any>): Promise<void> {
  try {
    await auth.setCustomUserClaims(uid, claims);
    console.log(`Custom claims set for user ${uid}:`, claims);
  } catch (error) {
    console.error('Error setting custom claims:', error);
    throw error;
  }
}

/**
 * Get Firestore timestamp
 */
export function getTimestamp(): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.now();
}

/**
 * Get server timestamp (for Firestore field value)
 */
export function getServerTimestamp(): admin.firestore.FieldValue {
  return admin.firestore.FieldValue.serverTimestamp();
}

/**
 * Batch write helper
 */
export function getBatch(): admin.firestore.WriteBatch {
  return db.batch();
}

/**
 * Transaction helper
 */
export async function runTransaction<T>(
  updateFunction: (transaction: admin.firestore.Transaction) => Promise<T>
): Promise<T> {
  return db.runTransaction(updateFunction);
}

/**
 * Send push notification to a single device
 */
export async function sendPushNotification(
  token: string,
  notification: {
    title: string;
    body: string;
  },
  data?: Record<string, string>
): Promise<string> {
  try {
    const message: admin.messaging.Message = {
      notification,
      data,
      token,
    };

    const response = await messaging.send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Send push notification to multiple devices
 */
export async function sendMulticastNotification(
  tokens: string[],
  notification: {
    title: string;
    body: string;
  },
  data?: Record<string, string>
): Promise<admin.messaging.BatchResponse> {
  try {
    const message: admin.messaging.MulticastMessage = {
      notification,
      data,
      tokens,
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log(`Successfully sent ${response.successCount} messages`);
    if (response.failureCount > 0) {
      console.log(`Failed to send ${response.failureCount} messages`);
    }
    return response;
  } catch (error) {
    console.error('Error sending multicast message:', error);
    throw error;
  }
}

/**
 * Send push notification to a topic
 */
export async function sendTopicNotification(
  topic: string,
  notification: {
    title: string;
    body: string;
  },
  data?: Record<string, string>
): Promise<string> {
  try {
    const message: admin.messaging.Message = {
      notification,
      data,
      topic,
    };

    const response = await messaging.send(message);
    console.log('Successfully sent message to topic:', response);
    return response;
  } catch (error) {
    console.error('Error sending message to topic:', error);
    throw error;
  }
}

/**
 * Upload file to Firebase Storage
 */
export async function uploadFile(
  filePath: string,
  destination: string,
  metadata?: {
    contentType?: string;
    metadata?: Record<string, string>;
  }
): Promise<string> {
  try {
    const bucket = storage.bucket();
    const file = bucket.file(destination);

    await bucket.upload(filePath, {
      destination,
      metadata,
    });

    // Get signed URL for the uploaded file
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2500', // Far future date
    });

    console.log(`File uploaded to ${destination}`);
    return url;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

/**
 * Delete file from Firebase Storage
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    const bucket = storage.bucket();
    await bucket.file(filePath).delete();
    console.log(`File deleted: ${filePath}`);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}
