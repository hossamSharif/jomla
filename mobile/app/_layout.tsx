/**
 * Root Layout for Expo Router
 *
 * Configures navigation structure and providers.
 */

import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/services/query-client';

export default function RootLayout() {
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
