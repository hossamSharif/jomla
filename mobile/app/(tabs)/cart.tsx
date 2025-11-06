/**
 * Cart Screen
 *
 * Displays user's shopping cart with offers and products.
 * Includes cart validation, warning banners for invalid items,
 * and checkout navigation.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore, useCartStore } from '../../src/store';
import { CartOfferItem } from '../../src/components/cart/CartOfferItem';
import { CartProductItem } from '../../src/components/cart/CartProductItem';
import { formatPrice } from '../../src/utils/cartValidation';
import { getCart, subscribeToCart } from '../../src/services/cartService';
import { getOfferById } from '../../src/services/offerService';
import { getProductById } from '../../src/services/productService';

export default function CartScreen() {
  const { user, isAuthenticated } = useAuthStore();
  const { cart, setCart } = useCartStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasInvalidOffers, setHasInvalidOffers] = useState(false);
  const [invalidOfferNames, setInvalidOfferNames] = useState<string[]>([]);

  // Load cart on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      loadCart();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  // Subscribe to real-time cart updates
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const unsubscribe = subscribeToCart(
      user.uid,
      (updatedCart) => {
        setCart(updatedCart);
        if (updatedCart) {
          checkForInvalidOffers(updatedCart);
        }
      },
      (error) => {
        console.error('Cart subscription error:', error);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, user]);

  const loadCart = async () => {
    try {
      if (!user) return;

      const fetchedCart = await getCart(user.uid);
      setCart(fetchedCart);

      if (fetchedCart) {
        await checkForInvalidOffers(fetchedCart);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      Alert.alert('Error', 'Failed to load cart. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadCart();
    setIsRefreshing(false);
  };

  /**
   * Check if any offers in the cart have been modified or deleted
   * This implements T068 - Cart invalidation detection
   */
  const checkForInvalidOffers = async (currentCart: any) => {
    if (!currentCart || currentCart.offers.length === 0) {
      setHasInvalidOffers(false);
      setInvalidOfferNames([]);
      return;
    }

    const invalidNames: string[] = [];
    let hasInvalid = false;

    // Check each offer in the cart
    for (const cartOffer of currentCart.offers) {
      try {
        const currentOffer = await getOfferById(cartOffer.offerId);

        // Check if offer exists and is still active
        if (!currentOffer || currentOffer.status !== 'active') {
          hasInvalid = true;
          invalidNames.push(cartOffer.offerName);
          continue;
        }

        // Check if offer price has changed
        const cartUnitPrice = cartOffer.discountedTotal / cartOffer.quantity;
        if (Math.abs(cartUnitPrice - currentOffer.discountedTotal) > 0.01) {
          hasInvalid = true;
          invalidNames.push(cartOffer.offerName);
        }
      } catch (error) {
        console.error(`Error checking offer ${cartOffer.offerId}:`, error);
        hasInvalid = true;
        invalidNames.push(cartOffer.offerName);
      }
    }

    setHasInvalidOffers(hasInvalid || currentCart.hasInvalidItems);
    setInvalidOfferNames(invalidNames);
  };

  const handleCheckout = () => {
    if (!cart || (cart.offers.length === 0 && cart.products.length === 0)) {
      Alert.alert('Empty Cart', 'Please add items to your cart before checking out.');
      return;
    }

    if (hasInvalidOffers || cart.hasInvalidItems) {
      Alert.alert(
        'Invalid Items',
        'Please remove invalid or changed offers from your cart before proceeding to checkout.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Navigate to checkout screen
    router.push('/checkout');
  };

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Sign In Required</Text>
          <Text style={styles.emptyText}>
            Please sign in to view your cart and checkout.
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2ECC71" />
          <Text style={styles.loadingText}>Loading cart...</Text>
        </View>
      </View>
    );
  }

  // Empty cart
  if (!cart || (cart.offers.length === 0 && cart.products.length === 0)) {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>
            Browse our offers and products to add items to your cart.
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push('/')}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  const itemCount = cart.offers.length + cart.products.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        <Text style={styles.headerSubtitle}>
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Invalid Items Warning Banner - T069 */}
        {(hasInvalidOffers || cart.hasInvalidItems) && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Cart Needs Attention</Text>
              <Text style={styles.warningText}>
                Some offers in your cart have been modified or are no longer available.
                {invalidOfferNames.length > 0 && (
                  <>
                    {'\n\n'}Affected offers:{'\n'}
                    {invalidOfferNames.map((name, idx) => `• ${name}`).join('\n')}
                  </>
                )}
                {'\n\n'}Please remove these items before checking out.
              </Text>
            </View>
          </View>
        )}

        {/* Offer Items Section */}
        {cart.offers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bundled Offers</Text>
            {cart.offers.map((offer) => (
              <CartOfferItem
                key={offer.offerId}
                item={offer}
                isInvalid={
                  cart.invalidOfferIds.includes(offer.offerId) ||
                  invalidOfferNames.includes(offer.offerName)
                }
              />
            ))}
          </View>
        )}

        {/* Product Items Section */}
        {cart.products.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Individual Products</Text>
            {cart.products.map((product) => (
              <CartProductItem key={product.productId} item={product} />
            ))}
          </View>
        )}

        {/* Spacer for bottom summary */}
        <View style={{ height: 200 }} />
      </ScrollView>

      {/* Bottom Summary */}
      <View style={styles.bottomSummary}>
        {/* Cart Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>{formatPrice(cart.subtotal)}</Text>
          </View>

          {cart.totalSavings > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.savingsLabel}>Total Savings:</Text>
              <Text style={styles.savingsValue}>-{formatPrice(cart.totalSavings)}</Text>
            </View>
          )}

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{formatPrice(cart.total)}</Text>
          </View>
        </View>

        {/* Checkout Button */}
        <TouchableOpacity
          style={[
            styles.checkoutButton,
            (hasInvalidOffers || cart.hasInvalidItems) && styles.checkoutButtonDisabled,
          ]}
          onPress={handleCheckout}
          disabled={hasInvalidOffers || cart.hasInvalidItems}
        >
          <Text style={styles.checkoutButtonText}>
            {hasInvalidOffers || cart.hasInvalidItems
              ? 'Remove Invalid Items to Continue'
              : 'Proceed to Checkout'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  warningBanner: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FFC107',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 6,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  bottomSummary: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  summarySection: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#666666',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  savingsLabel: {
    fontSize: 15,
    color: '#2ECC71',
    fontWeight: '600',
  },
  savingsValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2ECC71',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2ECC71',
  },
  checkoutButton: {
    backgroundColor: '#2ECC71',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  shopButton: {
    backgroundColor: '#2ECC71',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  signInButton: {
    backgroundColor: '#2ECC71',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
});
