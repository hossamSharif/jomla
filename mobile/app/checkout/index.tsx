/**
 * Checkout Screen
 *
 * Allows users to select fulfillment method (delivery/pickup) and complete their order.
 * Displays order summary, collects delivery or pickup details, and submits the order.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore, useCartStore } from '../../src/store';
import {
  DeliveryForm,
  DeliveryFormData,
} from '../../src/components/checkout/DeliveryForm';
import {
  PickupForm,
  PickupFormData,
} from '../../src/components/checkout/PickupForm';
import {
  submitOrder,
  calculateDeliveryFee,
  CreateOrderRequest,
} from '../../src/services/orderService';

type FulfillmentMethod = 'delivery' | 'pickup';

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { cart } = useCartStore();

  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>('delivery');
  const [deliveryData, setDeliveryData] = useState<DeliveryFormData | null>(null);
  const [pickupData, setPickupData] = useState<PickupFormData | null>(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate totals
  const subtotal = cart?.subtotal || 0;
  const totalSavings = cart?.totalSavings || 0;
  const deliveryFee = calculateDeliveryFee(fulfillmentMethod, subtotal);
  const tax = Math.round((subtotal + deliveryFee) * 0.1); // 10% tax
  const total = subtotal + deliveryFee + tax;

  /**
   * Redirect if cart is empty or user is not authenticated
   */
  useEffect(() => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to continue checkout.');
      router.replace('/(auth)/login');
      return;
    }

    if (!cart || (cart.offers.length === 0 && cart.products.length === 0)) {
      Alert.alert('Empty Cart', 'Your cart is empty. Please add items before checkout.');
      router.replace('/(tabs)/cart');
      return;
    }

    // Check for invalid items
    if (cart.hasInvalidItems) {
      Alert.alert(
        'Cart Contains Invalid Items',
        'Some items in your cart have changed or are no longer available. Please review your cart.',
        [
          {
            text: 'Review Cart',
            onPress: () => router.replace('/(tabs)/cart'),
          },
        ]
      );
    }
  }, [user, cart]);

  /**
   * Handle fulfillment method change
   */
  const handleMethodChange = (method: FulfillmentMethod) => {
    setFulfillmentMethod(method);
    setIsFormValid(false);
  };

  /**
   * Handle delivery form changes
   */
  const handleDeliveryChange = (data: DeliveryFormData, isValid: boolean) => {
    setDeliveryData(data);
    setIsFormValid(isValid);
  };

  /**
   * Handle pickup form changes
   */
  const handlePickupChange = (data: PickupFormData, isValid: boolean) => {
    setPickupData(data);
    setIsFormValid(isValid);
  };

  /**
   * Submit order
   */
  const handleSubmitOrder = async () => {
    if (!isFormValid || !user || !cart) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare order request
      const orderRequest: CreateOrderRequest = {
        cartId: user.uid,
        fulfillmentMethod,
      };

      if (fulfillmentMethod === 'delivery' && deliveryData) {
        orderRequest.deliveryDetails = {
          address: deliveryData.address,
          city: deliveryData.city,
          postalCode: deliveryData.postalCode,
          notes: deliveryData.notes || undefined,
        };
      } else if (fulfillmentMethod === 'pickup' && pickupData) {
        orderRequest.pickupDetails = {
          pickupTime: pickupData.pickupTime,
        };
      }

      // Submit order
      const response = await submitOrder(orderRequest);

      // Show success message
      Alert.alert(
        'Order Placed Successfully!',
        `Your order #${response.orderNumber} has been placed.`,
        [
          {
            text: 'View Order',
            onPress: () => router.replace(`/orders/${response.orderId}`),
          },
        ]
      );
    } catch (error: any) {
      console.error('Order submission error:', error);
      Alert.alert('Order Failed', error.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!cart || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Checkout</Text>
        </View>

        {/* Fulfillment Method Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Fulfillment Method</Text>
          <View style={styles.methodButtons}>
            <TouchableOpacity
              style={[
                styles.methodButton,
                fulfillmentMethod === 'delivery' && styles.methodButtonActive,
              ]}
              onPress={() => handleMethodChange('delivery')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.methodButtonText,
                  fulfillmentMethod === 'delivery' && styles.methodButtonTextActive,
                ]}
              >
                Delivery
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.methodButton,
                fulfillmentMethod === 'pickup' && styles.methodButtonActive,
              ]}
              onPress={() => handleMethodChange('pickup')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.methodButtonText,
                  fulfillmentMethod === 'pickup' && styles.methodButtonTextActive,
                ]}
              >
                Pickup
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Fulfillment Details Form */}
        <View style={styles.section}>
          {fulfillmentMethod === 'delivery' ? (
            <DeliveryForm onChange={handleDeliveryChange} />
          ) : (
            <PickupForm onChange={handlePickupChange} />
          )}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${(subtotal / 100).toFixed(2)}</Text>
          </View>
          {totalSavings > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.savingsLabel]}>Total Savings</Text>
              <Text style={[styles.summaryValue, styles.savingsValue]}>
                -${(totalSavings / 100).toFixed(2)}
              </Text>
            </View>
          )}
          {deliveryFee > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>${(deliveryFee / 100).toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax (10%)</Text>
            <Text style={styles.summaryValue}>${(tax / 100).toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${(total / 100).toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.placeOrderButton, (!isFormValid || isSubmitting) && styles.buttonDisabled]}
          onPress={handleSubmitOrder}
          disabled={!isFormValid || isSubmitting}
          activeOpacity={0.7}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeOrderButtonText}>Place Order - ${(total / 100).toFixed(2)}</Text>
          )}
        </TouchableOpacity>
      </View>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
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
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  methodButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  methodButton: {
    flex: 1,
    padding: 16,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  methodButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  methodButtonText: {
    fontSize: 16,
    color: '#666',
  },
  methodButtonTextActive: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    color: '#333',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  placeOrderButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  placeOrderButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
