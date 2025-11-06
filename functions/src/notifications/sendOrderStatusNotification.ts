/**
 * Send Order Status Notification Cloud Function
 *
 * Sends push notification when order status changes.
 */

import * as functions from 'firebase-functions';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

/**
 * Status message mapping
 */
const STATUS_MESSAGES: Record<string, string> = {
  pending: 'Your order has been received',
  confirmed: 'Your order has been confirmed!',
  preparing: 'Your order is being prepared',
  out_for_delivery: 'Your order is on the way!',
  ready_for_pickup: 'Your order is ready for pickup',
  completed: 'Your order has been delivered. Thanks!',
  cancelled: 'Your order has been cancelled',
};

/**
 * Firestore trigger: Sends push notification when order status changes
 */
export const sendOrderStatusNotification = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;

    // Only send notification if status actually changed
    if (before.status === after.status) {
      console.log(`Order ${orderId} status unchanged, no notification sent`);
      return;
    }

    try {
      const db = getFirestore();
      const messaging = getMessaging();

      // Get user's FCM tokens
      const userDoc = await db.doc(`users/${after.userId}`).get();
      if (!userDoc.exists) {
        console.error(`User ${after.userId} not found`);
        return;
      }

      const userData = userDoc.data();
      const fcmTokens = userData?.fcmTokens || [];

      if (fcmTokens.length === 0) {
        console.log(`No FCM tokens found for user ${after.userId}`);
        return;
      }

      // Get status message
      const statusMessage = STATUS_MESSAGES[after.status] || 'Your order status has been updated';

      // Prepare notification message
      const message = {
        notification: {
          title: `Order ${after.orderNumber}`,
          body: statusMessage,
        },
        data: {
          type: 'order_status',
          orderId: orderId,
          orderNumber: after.orderNumber,
          status: after.status,
          previousStatus: before.status,
        },
      };

      // Send to all user's FCM tokens
      const messageIds: string[] = [];
      const failedTokens: string[] = [];

      for (const token of fcmTokens) {
        try {
          const messageId = await messaging.send({
            ...message,
            token: token,
          });
          messageIds.push(messageId);
          console.log(`Notification sent to token ${token.substring(0, 10)}...`);
        } catch (error: any) {
          console.error(`Failed to send to token ${token.substring(0, 10)}...`, error);
          failedTokens.push(token);

          // Remove invalid tokens (expired or unregistered)
          if (
            error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered'
          ) {
            console.log(`Removing invalid token: ${token.substring(0, 10)}...`);
            await db.doc(`users/${after.userId}`).update({
              fcmTokens: FieldValue.arrayRemove(token),
            });
          }
        }
      }

      console.log(`Order status notification sent: ${messageIds.length} succeeded, ${failedTokens.length} failed`);

      // Log notification to Firestore
      await db.collection('notifications').add({
        type: 'order_status',
        title: message.notification.title,
        body: message.notification.body,
        targetType: 'user',
        targetUserId: after.userId,
        relatedOrderId: orderId,
        relatedOrderNumber: after.orderNumber,
        status: after.status,
        previousStatus: before.status,
        sentAt: FieldValue.serverTimestamp(),
        deliveryStatus: messageIds.length > 0 ? 'sent' : 'failed',
        messageIds: messageIds,
        successCount: messageIds.length,
        failureCount: failedTokens.length,
        metadata: {
          fulfillmentMethod: after.fulfillmentMethod,
          total: after.total,
        },
      });

      console.log(`Notification logged for order ${orderId}`);
    } catch (error: any) {
      console.error('Error sending order status notification:', error);

      // Log failed notification
      try {
        const db = getFirestore();
        await db.collection('notifications').add({
          type: 'order_status',
          title: `Order ${after.orderNumber}`,
          body: STATUS_MESSAGES[after.status] || 'Your order status has been updated',
          targetType: 'user',
          targetUserId: after.userId,
          relatedOrderId: orderId,
          relatedOrderNumber: after.orderNumber,
          status: after.status,
          previousStatus: before.status,
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
