/**
 * Root Layout for Expo Router
 *
 * Configures navigation structure, auth redirect logic, and providers.
 */

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Linking } from 'react-native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, persistOptions } from '../src/services/query-client';
import { useAuthStore } from '../src/store';
import { setupAuthListener } from '../src/services/auth';
import { initializeSessionMonitoring } from '../src/services/sessionService';
import {
  setupNotificationListeners,
  configureNotificationChannels,
  setupFCMTokenRefresh,
} from '../src/services/notificationService';
import {
  handleForegroundNotification,
  handleNotificationTap,
  handleDeepLink,
} from '../src/utils/notificationHandler';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

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

  // Setup FCM token refresh monitoring
  useEffect(() => {
    if (user?.uid) {
      const cleanup = setupFCMTokenRefresh(user.uid);
      return () => cleanup();
    }
  }, [user?.uid]);

  // Setup notification listeners
  useEffect(() => {
    // Configure notification channels for Android
    configureNotificationChannels();

    // Setup notification listeners
    const cleanup = setupNotificationListeners(
      handleForegroundNotification,
      handleNotificationTap
    );

    return () => cleanup();
  }, []);

  // Setup deep linking
  useEffect(() => {
    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('Initial deep link URL:', url);
        handleDeepLink(url);
      }
    });

    // Listen for deep link events while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('Deep link event:', event.url);
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
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
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
      >
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="orders" options={{ headerShown: false }} />
        </Stack>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}
