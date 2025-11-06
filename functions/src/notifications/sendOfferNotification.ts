/**
 * Send Offer Notification Cloud Function
 *
 * Sends push notification when a new offer is published (status changes to 'active').
 */

import * as functions from 'firebase-functions';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

/**
 * Firestore trigger: Sends push notification when offer becomes active
 */
export const sendOfferNotification = functions.firestore
  .document('offers/{offerId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const offerId = context.params.offerId;

    // Only send when offer status changes from non-active to active
    if (before.status === 'active' || after.status !== 'active') {
      console.log(`Offer ${offerId} status change does not trigger notification`);
      return;
    }

    try {
      const db = getFirestore();
      const messaging = getMessaging();

      // Calculate savings percentage
      const savingsPercentage = Math.round(
        ((after.totalOriginalPrice - after.totalDiscountedPrice) / after.totalOriginalPrice) * 100
      );

      // Prepare notification message
      const message = {
        notification: {
          title: 'New Offer Available!',
          body: `${after.name} - Save ${savingsPercentage}%`,
        },
        data: {
          type: 'new_offer',
          offerId: offerId,
          offerName: after.name,
          savings: savingsPercentage.toString(),
        },
        topic: 'all-users', // Send to all users subscribed to the topic
      };

      // Send notification
      const messageId = await messaging.send(message);
      console.log('Offer notification sent successfully:', messageId);

      // Log notification to Firestore
      await db.collection('notifications').add({
        type: 'new_offer',
        title: message.notification.title,
        body: message.notification.body,
        targetType: 'topic',
        targetTopic: 'all-users',
        relatedOfferId: offerId,
        relatedOfferName: after.name,
        sentAt: FieldValue.serverTimestamp(),
        deliveryStatus: 'sent',
        messageId: messageId,
        metadata: {
          savingsPercentage,
          totalOriginalPrice: after.totalOriginalPrice,
          totalDiscountedPrice: after.totalDiscountedPrice,
        },
      });

      console.log(`Notification logged for offer ${offerId}`);
    } catch (error: any) {
      console.error('Error sending offer notification:', error);

      // Log failed notification
      try {
        const db = getFirestore();
        await db.collection('notifications').add({
          type: 'new_offer',
          title: 'New Offer Available!',
          body: `${after.name} - Save on your groceries`,
          targetType: 'topic',
          targetTopic: 'all-users',
          relatedOfferId: offerId,
          relatedOfferName: after.name,
          sentAt: FieldValue.serverTimestamp(),
          deliveryStatus: 'failed',
          error: error.message,
        });
      } catch (logError: any) {
        console.error('Failed to log failed notification:', logError);
      }

      throw error; // Re-throw to trigger Cloud Functions retry
    }
  });
