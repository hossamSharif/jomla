/**
 * Offer Details Screen
 *
 * Displays detailed information about a specific offer including:
 * - Offer image and description
 * - Complete product breakdown with individual pricing
 * - Savings calculation
 * - Quantity limits
 * - Add to cart functionality (to be implemented in Phase 5)
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useOffer } from '../../src/hooks/useOffers';
import { formatOfferPrice, isOfferValid } from '../../src/services/offerService';

export default function OfferDetailsScreen() {
  const { offerId } = useLocalSearchParams<{ offerId: string }>();
  const { data: offer, isLoading, isError, error } = useOffer(offerId);

  // Render loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2ECC71" />
          <Text style={styles.loadingText}>Loading offer details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (isError || !offer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>Offer Not Found</Text>
          <Text style={styles.errorMessage}>
            {error?.message || 'This offer may have been removed or is no longer available.'}
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isValid = isOfferValid(offer);
  const originalPrice = formatOfferPrice(offer.originalTotal);
  const discountedPrice = formatOfferPrice(offer.discountedTotal);
  const savingsAmount = formatOfferPrice(offer.totalSavings);
  const savingsPercent = Math.round(offer.savingsPercentage);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Offer Image */}
        {offer.imageUrl && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: offer.imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
            {isValid && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Save {savingsPercent}%</Text>
              </View>
            )}
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Offer Name */}
          <Text style={styles.name}>{offer.name}</Text>

          {/* Status */}
          {!isValid && (
            <View style={styles.inactiveTag}>
              <Text style={styles.inactiveTagText}>Offer Expired</Text>
            </View>
          )}

          {/* Description */}
          {offer.description && (
            <Text style={styles.description}>{offer.description}</Text>
          )}

          {/* Pricing Section */}
          <View style={styles.pricingCard}>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Original Total</Text>
              <Text style={styles.originalPrice}>{originalPrice}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Offer Price</Text>
              <Text style={styles.discountedPrice}>{discountedPrice}</Text>
            </View>
            <View style={[styles.pricingRow, styles.savingsRow]}>
              <Text style={styles.savingsLabel}>You Save</Text>
              <Text style={styles.savings}>{savingsAmount}</Text>
            </View>
          </View>

          {/* Products Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What's Included</Text>
            <Text style={styles.sectionSubtitle}>
              {offer.products.length} {offer.products.length === 1 ? 'item' : 'items'}
            </Text>

            {offer.products.map((product, index) => (
              <View key={index} style={styles.productItem}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.productName}</Text>
                  <View style={styles.productPricing}>
                    <Text style={styles.productOriginalPrice}>
                      {formatOfferPrice(product.basePrice)}
                    </Text>
                    <Text style={styles.productDiscountedPrice}>
                      {formatOfferPrice(product.discountedPrice)}
                    </Text>
                  </View>
                  <Text style={styles.productSavings}>
                    Save {formatOfferPrice(product.discountAmount)} ({Math.round(product.discountPercentage)}%)
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Quantity Limits */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Limits</Text>
            <View style={styles.limitsContainer}>
              <View style={styles.limitItem}>
                <Text style={styles.limitLabel}>Minimum Quantity</Text>
                <Text style={styles.limitValue}>{offer.minQuantity}</Text>
              </View>
              <View style={styles.limitItem}>
                <Text style={styles.limitLabel}>Maximum Quantity</Text>
                <Text style={styles.limitValue}>{offer.maxQuantity}</Text>
              </View>
            </View>
          </View>

          {/* Validity Period */}
          {(offer.validFrom || offer.validUntil) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Validity Period</Text>
              {offer.validFrom && (
                <Text style={styles.validityText}>
                  From: {new Date(offer.validFrom.toMillis()).toLocaleDateString()}
                </Text>
              )}
              {offer.validUntil && (
                <Text style={styles.validityText}>
                  Until: {new Date(offer.validUntil.toMillis()).toLocaleDateString()}
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add to Cart Button (Placeholder for Phase 5) */}
      {isValid && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.addToCartButton}
            disabled
          >
            <Text style={styles.addToCartButtonText}>
              Add to Cart (Coming Soon)
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#E0E0E0',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  inactiveTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#E74C3C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 12,
  },
  inactiveTagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
    marginBottom: 20,
  },
  pricingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  savingsRow: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginBottom: 0,
  },
  pricingLabel: {
    fontSize: 16,
    color: '#666666',
  },
  originalPrice: {
    fontSize: 18,
    color: '#999999',
    textDecorationLine: 'line-through',
  },
  discountedPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2ECC71',
  },
  savingsLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2ECC71',
  },
  savings: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2ECC71',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 16,
  },
  productItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  productPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  productOriginalPrice: {
    fontSize: 14,
    color: '#999999',
    textDecorationLine: 'line-through',
  },
  productDiscountedPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2ECC71',
  },
  productSavings: {
    fontSize: 12,
    color: '#2ECC71',
    fontWeight: '600',
  },
  limitsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  limitItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  limitLabel: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 4,
  },
  limitValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  validityText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  addToCartButton: {
    backgroundColor: '#CCCCCC',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addToCartButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E74C3C',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#2ECC71',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
