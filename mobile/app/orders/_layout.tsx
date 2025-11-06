/**
 * Orders Layout
 *
 * Stack navigation for order-related screens
 */

import { Stack } from 'expo-router';

export default function OrdersLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="index"
        options={{ title: 'My Orders' }}
      />
      <Stack.Screen
        name="[orderId]"
        options={{ title: 'Order Details' }}
      />
    </Stack>
  );
}
