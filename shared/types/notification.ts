/**
 * Notification Types
 *
 * Stores notification history and delivery status.
 */

import { Timestamp } from 'firebase/firestore';

export type NotificationType = 'new_offer' | 'order_status' | 'general';

export type NotificationTargetType = 'all' | 'user' | 'topic';

export type NotificationDeliveryStatus = 'pending' | 'sent' | 'failed';

export interface Notification {
  id: string;
  type: NotificationType;

  // Content
  title: string;
  body: string;
  data?: Record<string, any>;     // Custom payload (offerId, orderId, etc.)

  // Targeting
  targetType: NotificationTargetType;
  targetUserId?: string;          // For user-specific notifications
  targetTopic?: string;           // For topic-based (e.g., 'all-users')

  // Delivery
  sentAt: Timestamp;
  deliveryStatus: NotificationDeliveryStatus;
  fcmMessageId?: string;

  // Reference
  relatedOfferId?: string;
  relatedOrderId?: string;

  // Metadata
  createdBy?: string;             // Admin user ID (for manual notifications)
}
