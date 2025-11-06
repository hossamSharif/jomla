/**
 * Order Card Component
 *
 * Displays order summary with status, order number, date, total, and fulfillment details.
 * Used in order history list.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Order } from '../../../../shared/types/order';
import { formatOrderStatus, getOrderStatusColor } from '../../services/orderService';

export interface OrderCardProps {
  order: Order;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const router = useRouter();

  /**
   * Format date for display
   */
  const formatDate = (timestamp: any): string => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get item count
   */
  const getItemCount = (): number => {
    const offerCount = order.offers?.reduce((sum, offer) => sum + offer.quantity, 0) || 0;
    const productCount = order.products?.reduce((sum, product) => sum + product.quantity, 0) || 0;
    return offerCount + productCount;
  };

  /**
   * Navigate to order details
   */
  const handlePress = () => {
    router.push(`/orders/${order.id}`);
  };

  const statusColor = getOrderStatusColor(order.status);
  const itemCount = getItemCount();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Header with Order Number and Status */}
      <View style={styles.header}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{formatOrderStatus(order.status)}</Text>
        </View>
      </View>

      {/* Order Details */}
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Items:</Text>
          <Text style={styles.detailValue}>{itemCount}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Fulfillment:</Text>
          <Text style={styles.detailValue}>
            {order.fulfillmentMethod === 'delivery' ? 'Delivery' : 'Pickup'}
          </Text>
        </View>
        {order.fulfillmentMethod === 'delivery' && order.deliveryDetails && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Address:</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {order.deliveryDetails.city}
            </Text>
          </View>
        )}
      </View>

      {/* Footer with Total */}
      <View style={styles.footer}>
        <Text style={styles.totalLabel}>Total:</Text>
        <Text style={styles.totalValue}>${(order.total / 100).toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  details: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});
