/**
 * Notification Service
 *
 * Handles FCM token registration and push notification permissions.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { addFCMToken, removeFCMToken } from './userService';

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions from user
 * @returns true if permission granted, false otherwise
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    // Only request permissions on physical devices
    if (!Device.isDevice) {
      console.warn('Notifications are not supported in simulator/emulator');
      return false;
    }

    // Check current permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    return true;
  } catch (error: any) {
    console.error('Request notification permissions error:', error);
    return false;
  }
}

/**
 * Get FCM push notification token
 * @returns FCM token or null if failed
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.warn('Cannot get push token in simulator/emulator');
      return null;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'your-project-id',
    });

    return tokenData.data;
  } catch (error: any) {
    console.error('Get Expo push token error:', error);
    return null;
  }
}

/**
 * Get device push notification token (native FCM token for Android, APNs for iOS)
 * @returns Device token or null if failed
 */
export async function getDevicePushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      return null;
    }

    // Get native device token
    const tokenData = await Notifications.getDevicePushTokenAsync();

    return tokenData.data;
  } catch (error: any) {
    console.error('Get device push token error:', error);
    return null;
  }
}

/**
 * Register FCM token for user
 * @param uid User ID
 * @returns true if successful, false otherwise
 */
export async function registerFCMToken(uid: string): Promise<boolean> {
  try {
    // Request permissions first
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('Cannot register FCM token without notification permissions');
      return false;
    }

    // Get push token
    const token = await getExpoPushToken();
    if (!token) {
      console.warn('Failed to get push token');
      return false;
    }

    // Register token with user document
    await addFCMToken(uid, token);

    console.log('FCM token registered successfully');
    return true;
  } catch (error: any) {
    console.error('Register FCM token error:', error);
    return false;
  }
}

/**
 * Unregister FCM token for user (on logout)
 * @param uid User ID
 */
export async function unregisterFCMToken(uid: string): Promise<void> {
  try {
    const token = await getExpoPushToken();
    if (token) {
      await removeFCMToken(uid, token);
      console.log('FCM token unregistered');
    }
  } catch (error: any) {
    console.error('Unregister FCM token error:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Setup notification listeners
 * @returns Cleanup function to remove listeners
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void
): () => void {
  // Listener for when notification is received while app is in foreground
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('Notification received:', notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    }
  );

  // Listener for when user taps on notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log('Notification tapped:', response);
      if (onNotificationTapped) {
        onNotificationTapped(response);
      }
    }
  );

  // Return cleanup function
  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Check if notification permissions are granted
 */
export async function hasNotificationPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error: any) {
    console.error('Check notification permissions error:', error);
    return false;
  }
}

/**
 * Configure notification channels for Android
 */
export async function configureNotificationChannels(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      // Create notification channels for Android
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Order Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        description: 'Notifications about your orders',
      });

      await Notifications.setNotificationChannelAsync('offers', {
        name: 'New Offers',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        description: 'Notifications about new offers and promotions',
      });

      console.log('Notification channels configured');
    }
  } catch (error: any) {
    console.error('Configure notification channels error:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Schedule a local notification (for testing)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  triggerSeconds: number = 0
): Promise<string> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: triggerSeconds > 0 ? { seconds: triggerSeconds } : null,
    });

    console.log('Local notification scheduled:', notificationId);
    return notificationId;
  } catch (error: any) {
    console.error('Schedule local notification error:', error);
    throw new Error(error.message || 'Failed to schedule notification');
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('Notification cancelled:', notificationId);
  } catch (error: any) {
    console.error('Cancel notification error:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All notifications cancelled');
  } catch (error: any) {
    console.error('Cancel all notifications error:', error);
  }
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  try {
    const count = await Notifications.getBadgeCountAsync();
    return count;
  } catch (error: any) {
    console.error('Get badge count error:', error);
    return 0;
  }
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error: any) {
    console.error('Set badge count error:', error);
  }
}

/**
 * Clear badge count
 */
export async function clearBadgeCount(): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch (error: any) {
    console.error('Clear badge count error:', error);
  }
}
