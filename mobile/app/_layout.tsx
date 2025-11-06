/**
 * Root Layout for Expo Router
 *
 * Configures navigation structure, auth redirect logic, and providers.
 */

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/services/query-client';
import { useAuthStore } from '../src/store';
import { setupAuthListener } from '../src/services/auth';
import { initializeSessionMonitoring } from '../src/services/sessionService';
import {
  setupNotificationListeners,
  configureNotificationChannels,
} from '../src/services/notificationService';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, user } = useAuthStore();

  // Setup auth state listener
  useEffect(() => {
    const unsubscribe = setupAuthListener();
    return () => unsubscribe();
  }, []);

  // Setup session monitoring
  useEffect(() => {
    if (user?.uid) {
      const cleanup = initializeSessionMonitoring(user.uid);
      return () => cleanup();
    }
  }, [user?.uid]);

  // Setup notification listeners
  useEffect(() => {
    configureNotificationChannels();

    const cleanup = setupNotificationListeners(
      (notification) => {
        // Handle foreground notification
        console.log('Foreground notification:', notification);
      },
      (response) => {
        // Handle notification tap
        console.log('Notification tapped:', response);

        // Navigate based on notification data
        const data = response.notification.request.content.data;

        if (data.orderId) {
          router.push(`/orders/${data.orderId}`);
        } else if (data.offerId) {
          router.push(`/offers/${data.offerId}`);
        }
      }
    );

    return () => cleanup();
  }, []);

  // Auth redirect logic
  useEffect(() => {
    if (isLoading) {
      // Wait for auth state to load
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated) {
      // User is not authenticated, redirect to login
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else {
      // User is authenticated
      if (inAuthGroup) {
        // Check if phone is verified
        if (!user?.isPhoneVerified) {
          // Redirect to phone verification
          router.replace('/(auth)/verify-phone');
        } else {
          // Redirect to main app
          router.replace('/(tabs)');
        }
      }
    }
  }, [isAuthenticated, isLoading, segments, user?.isPhoneVerified]);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="orders" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}
