/**
 * Order History Screen
 *
 * Displays a list of user's orders sorted by date (newest first).
 * Users can tap on an order to view details.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store';
import { fetchUserOrders } from '../../src/services/orderService';
import { OrderCard } from '../../src/components/orders/OrderCard';
import { Order } from '../../../shared/types/order';

export default function OrderHistoryScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load user's orders
   */
  const loadOrders = async (showRefreshIndicator = false) => {
    if (!user) {
      setError('Please log in to view your orders');
      setIsLoading(false);
      return;
    }

    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const userOrders = await fetchUserOrders(user.uid, 20);
      setOrders(userOrders);
    } catch (err: any) {
      console.error('Error loading orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  /**
   * Load orders on mount
   */
  useEffect(() => {
    loadOrders();
  }, [user]);

  /**
   * Handle pull to refresh
   */
  const handleRefresh = () => {
    loadOrders(true);
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => {
    if (isLoading) {
      return null;
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Error Loading Orders</Text>
          <Text style={styles.emptyMessage}>{error}</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Orders Yet</Text>
        <Text style={styles.emptyMessage}>
          You haven't placed any orders yet. Start shopping to see your orders here!
        </Text>
      </View>
    );
  };

  /**
   * Render order card
   */
  const renderOrderCard = ({ item }: { item: Order }) => {
    return <OrderCard order={item} />;
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading your orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
        {orders.length > 0 && (
          <Text style={styles.orderCount}>
            {orders.length} {orders.length === 1 ? 'order' : 'orders'}
          </Text>
        )}
      </View>

      {/* Order List */}
      <FlatList
        data={orders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          orders.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  orderCount: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});
