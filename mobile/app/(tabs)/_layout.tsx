/**
 * Tabs Layout
 *
 * Bottom tab navigation for main app screens
 */

import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Offers',
          tabBarLabel: 'Offers'
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarLabel: 'Products'
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarLabel: 'Cart'
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile'
        }}
      />
    </Tabs>
  );
}
