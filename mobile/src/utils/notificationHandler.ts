/**
 * Notification Handler Utility
 *
 * Routes notification taps to appropriate screens based on notification type and data.
 */

import { Notification, NotificationResponse } from 'expo-notifications';
import { router } from 'expo-router';
import { Alert } from 'react-native';

/**
 * Notification data structure
 */
export interface NotificationData {
  type?: string;
  offerId?: string;
  orderId?: string;
  orderNumber?: string;
  status?: string;
  cartInvalidated?: string;
  [key: string]: any;
}

/**
 * Handle foreground notification (app is open)
 */
export function handleForegroundNotification(notification: Notification): void {
  try {
    const data = notification.request.content.data as NotificationData;
    const title = notification.request.content.title || 'Notification';
    const body = notification.request.content.body || '';

    console.log('Foreground notification received:', {
      type: data.type,
      title,
      body,
    });

    // Handle cart invalidation notifications silently
    if (data.type === 'cart_invalidation' || data.cartInvalidated === 'true') {
      console.log('Cart invalidation notification - silent handling');
      // Could trigger a cart refresh here
      return;
    }

    // For other notifications, just log them - they will be displayed by the system
    console.log(`Notification displayed: ${title} - ${body}`);
  } catch (error: any) {
    console.error('Error handling foreground notification:', error);
  }
}

/**
 * Handle notification tap (user interacted with notification)
 */
export function handleNotificationTap(response: NotificationResponse): void {
  try {
    const data = response.notification.request.content.data as NotificationData;
    console.log('Notification tapped:', data);

    // Route based on notification type
    switch (data.type) {
      case 'new_offer':
        handleOfferNotification(data);
        break;

      case 'order_status':
        handleOrderNotification(data);
        break;

      case 'cart_invalidation':
        handleCartInvalidationNotification(data);
        break;

      default:
        console.warn('Unknown notification type:', data.type);
        // Try to infer from data
        if (data.offerId) {
          handleOfferNotification(data);
        } else if (data.orderId) {
          handleOrderNotification(data);
        }
        break;
    }
  } catch (error: any) {
    console.error('Error handling notification tap:', error);
    Alert.alert('Error', 'Failed to open notification content');
  }
}

/**
 * Handle offer notification tap
 */
function handleOfferNotification(data: NotificationData): void {
  if (!data.offerId) {
    console.warn('Offer notification missing offerId');
    return;
  }

  console.log(`Navigating to offer: ${data.offerId}`);
  router.push(`/offers/${data.offerId}`);
}

/**
 * Handle order status notification tap
 */
function handleOrderNotification(data: NotificationData): void {
  if (!data.orderId) {
    console.warn('Order notification missing orderId');
    return;
  }

  console.log(`Navigating to order: ${data.orderId}`);
  router.push(`/orders/${data.orderId}`);
}

/**
 * Handle cart invalidation notification tap
 */
function handleCartInvalidationNotification(data: NotificationData): void {
  console.log('Navigating to cart for invalidation warning');
  router.push('/(tabs)/cart');

  // Show alert about cart changes
  setTimeout(() => {
    Alert.alert(
      'Cart Updated',
      'Some items in your cart have changed or are no longer available. Please review your cart before checkout.',
      [{ text: 'OK' }]
    );
  }, 500);
}

/**
 * Deep link handler for custom URL schemes
 * Format: jomla-grocery://offers/{offerId} or jomla-grocery://orders/{orderId}
 */
export function handleDeepLink(url: string): void {
  try {
    console.log('Deep link received:', url);

    // Remove scheme
    const path = url.replace(/^jomla-grocery:\/\//, '');

    // Parse path
    const [resource, id] = path.split('/');

    switch (resource) {
      case 'offers':
        if (id) {
          router.push(`/offers/${id}`);
        } else {
          router.push('/(tabs)'); // Browse offers
        }
        break;

      case 'orders':
        if (id) {
          router.push(`/orders/${id}`);
        } else {
          router.push('/orders'); // Order history
        }
        break;

      case 'cart':
        router.push('/(tabs)/cart');
        break;

      case 'products':
        if (id) {
          router.push(`/products/${id}`);
        } else {
          router.push('/(tabs)/products');
        }
        break;

      default:
        console.warn('Unknown deep link resource:', resource);
        router.push('/(tabs)'); // Default to home
        break;
    }
  } catch (error: any) {
    console.error('Error handling deep link:', error);
    router.push('/(tabs)'); // Default to home on error
  }
}

/**
 * Get notification badge count (for displaying unread count)
 */
export async function getNotificationBadgeCount(): Promise<number> {
  // This would typically query Firestore for unread notifications
  // For now, we'll return 0 as a placeholder
  return 0;
}

/**
 * Clear notification badge count
 */
export async function clearNotificationBadgeCount(): Promise<void> {
  // This would typically mark notifications as read in Firestore
  // For now, it's a placeholder
  console.log('Badge count cleared');
}

/**
 * Subscribe to notification topic (for all users)
 */
export function subscribeToTopic(topic: string): void {
  // Note: Topic subscription is handled by FCM on the backend
  // when the FCM token is registered
  console.log(`Subscribe to topic: ${topic}`);
}

/**
 * Unsubscribe from notification topic
 */
export function unsubscribeFromTopic(topic: string): void {
  // Note: Topic unsubscription is handled by FCM on the backend
  console.log(`Unsubscribe from topic: ${topic}`);
}
