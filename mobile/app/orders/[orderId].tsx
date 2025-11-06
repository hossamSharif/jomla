/**
 * Order Details Screen
 *
 * Displays complete order information including:
 * - Order status and timeline
 * - Product/offer breakdown
 * - Pricing details
 * - Fulfillment information
 * - Invoice download/view functionality
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchOrderById, formatOrderStatus, getOrderStatusColor } from '../../src/services/orderService';
import { Order } from '../../../shared/types/order';

export default function OrderDetailsScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load order details
   */
  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        setError('Order ID not provided');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const orderData = await fetchOrderById(orderId);
        if (!orderData) {
          setError('Order not found');
        } else {
          setOrder(orderData);
        }
      } catch (err: any) {
        console.error('Error loading order:', err);
        setError(err.message || 'Failed to load order details');
      } finally {
        setIsLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  /**
   * Format date for display
   */
  const formatDate = (timestamp: any): string => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Handle invoice download/view
   */
  const handleViewInvoice = async () => {
    if (!order?.invoiceUrl) {
      Alert.alert('Invoice Not Available', 'Invoice is being generated. Please try again in a moment.');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(order.invoiceUrl);
      if (supported) {
        await Linking.openURL(order.invoiceUrl);
      } else {
        Alert.alert('Error', 'Unable to open invoice. Please try again later.');
      }
    } catch (error) {
      console.error('Error opening invoice:', error);
      Alert.alert('Error', 'Failed to open invoice. Please try again later.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorMessage}>{error || 'Order not found'}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = getOrderStatusColor(order.status);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{formatOrderStatus(order.status)}</Text>
        </View>
      </View>

      {/* Order Date */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Date</Text>
        <Text style={styles.infoText}>{formatDate(order.createdAt)}</Text>
      </View>

      {/* Customer Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Information</Text>
        <Text style={styles.infoText}>{order.customerName}</Text>
        <Text style={styles.infoText}>{order.customerEmail}</Text>
        <Text style={styles.infoText}>{order.customerPhone}</Text>
      </View>

      {/* Fulfillment Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fulfillment</Text>
        <Text style={styles.infoText}>
          Method: {order.fulfillmentMethod === 'delivery' ? 'Delivery' : 'Pickup'}
        </Text>
        {order.fulfillmentMethod === 'delivery' && order.deliveryDetails && (
          <>
            <Text style={[styles.infoText, styles.marginTop]}>Delivery Address:</Text>
            <Text style={styles.infoText}>{order.deliveryDetails.address}</Text>
            <Text style={styles.infoText}>
              {order.deliveryDetails.city}, {order.deliveryDetails.postalCode}
            </Text>
            {order.deliveryDetails.notes && (
              <Text style={[styles.infoText, styles.marginTop]}>
                Notes: {order.deliveryDetails.notes}
              </Text>
            )}
          </>
        )}
        {order.fulfillmentMethod === 'pickup' && order.pickupDetails && (
          <>
            <Text style={[styles.infoText, styles.marginTop]}>
              Pickup Time: {formatDate(order.pickupDetails.pickupTime)}
            </Text>
            <Text style={styles.infoText}>
              Location: {order.pickupDetails.pickupLocation}
            </Text>
          </>
        )}
      </View>

      {/* Order Items - Offers */}
      {order.offers && order.offers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bundled Offers</Text>
          {order.offers.map((offer, index) => (
            <View key={index} style={styles.itemCard}>
              <Text style={styles.itemName}>
                {offer.offerName} (x{offer.quantity})
              </Text>
              {offer.products.map((product, pIndex) => (
                <Text key={pIndex} style={styles.productInOffer}>
                  • {product.productName}
                </Text>
              ))}
              <View style={styles.itemPricing}>
                <Text style={styles.itemPrice}>
                  ${(offer.discountedTotal / 100).toFixed(2)}
                </Text>
                {offer.originalTotal > offer.discountedTotal && (
                  <Text style={styles.originalPrice}>
                    ${(offer.originalTotal / 100).toFixed(2)}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Order Items - Individual Products */}
      {order.products && order.products.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Individual Products</Text>
          {order.products.map((product, index) => (
            <View key={index} style={styles.itemCard}>
              <Text style={styles.itemName}>
                {product.productName} (x{product.quantity})
              </Text>
              <View style={styles.itemPricing}>
                <Text style={styles.itemPrice}>
                  ${(product.totalPrice / 100).toFixed(2)}
                </Text>
                <Text style={styles.pricePerUnit}>
                  ${(product.pricePerUnit / 100).toFixed(2)} each
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Pricing Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>${(order.subtotal / 100).toFixed(2)}</Text>
        </View>
        {order.totalSavings > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, styles.savingsLabel]}>Total Savings</Text>
            <Text style={[styles.summaryValue, styles.savingsValue]}>
              -${(order.totalSavings / 100).toFixed(2)}
            </Text>
          </View>
        )}
        {order.deliveryFee > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>${(order.deliveryFee / 100).toFixed(2)}</Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax</Text>
          <Text style={styles.summaryValue}>${(order.tax / 100).toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${(order.total / 100).toFixed(2)}</Text>
        </View>
      </View>

      {/* Invoice Button */}
      {order.invoiceUrl && (
        <TouchableOpacity
          style={styles.invoiceButton}
          onPress={handleViewInvoice}
          activeOpacity={0.7}
        >
          <Text style={styles.invoiceButtonText}>View Invoice (PDF)</Text>
        </TouchableOpacity>
      )}

      {/* Status History */}
      {order.statusHistory && order.statusHistory.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Timeline</Text>
          {order.statusHistory.map((entry, index) => (
            <View key={index} style={styles.timelineEntry}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineStatus}>{formatOrderStatus(entry.status)}</Text>
                <Text style={styles.timelineDate}>{formatDate(entry.timestamp)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 32,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  marginTop: {
    marginTop: 8,
  },
  itemCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  productInOffer: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginBottom: 4,
  },
  itemPricing: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  originalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  pricePerUnit: {
    fontSize: 12,
    color: '#999',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
  },
  savingsLabel: {
    color: '#4CAF50',
  },
  savingsValue: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  invoiceButton: {
    backgroundColor: '#4CAF50',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  invoiceButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timelineEntry: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    marginTop: 4,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: '#666',
  },
});
