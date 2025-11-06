/**
 * OfferCard Component
 *
 * Displays a bundled offer with pricing, savings, and product breakdown.
 * Shows original total, discounted total, and savings percentage.
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Offer } from '../../../shared/types/offer';
import { formatOfferPrice, isOfferValid } from '../services/offerService';
import { router } from 'expo-router';

interface OfferCardProps {
  offer: Offer;
  onPress?: (offer: Offer) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - 32; // 16px margin on each side

export function OfferCard({ offer, onPress }: OfferCardProps) {
  const handlePress = () => {
    if (onPress) {
      onPress(offer);
    } else {
      // Navigate to offer details screen
      router.push(`/offers/${offer.id}`);
    }
  };

  const isValid = isOfferValid(offer);
  const originalPrice = formatOfferPrice(offer.originalTotal);
  const discountedPrice = formatOfferPrice(offer.discountedTotal);
  const savingsAmount = formatOfferPrice(offer.totalSavings);
  const savingsPercent = Math.round(offer.savingsPercentage);

  return (
    <TouchableOpacity
      style={[styles.card, !isValid && styles.cardInactive]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={!isValid}
    >
      {/* Offer Image */}
      {offer.imageUrl && (
        <Image
          source={{ uri: offer.thumbnailUrl || offer.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      {/* Savings Badge */}
      {isValid && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Save {savingsPercent}%</Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Offer Name */}
        <Text style={styles.name} numberOfLines={2}>
          {offer.name}
        </Text>

        {/* Offer Description */}
        {offer.description && (
          <Text style={styles.description} numberOfLines={2}>
            {offer.description}
          </Text>
        )}

        {/* Product Count */}
        <Text style={styles.productCount}>
          {offer.products.length} {offer.products.length === 1 ? 'item' : 'items'} included
        </Text>

        {/* Pricing Section */}
        <View style={styles.pricingSection}>
          {/* Original Price (Strikethrough) */}
          <Text style={styles.originalPrice}>{originalPrice}</Text>

          {/* Discounted Price */}
          <Text style={styles.discountedPrice}>{discountedPrice}</Text>
        </View>

        {/* Savings Amount */}
        <Text style={styles.savings}>You save {savingsAmount}</Text>

        {/* Quantity Limits */}
        <View style={styles.quantityLimits}>
          {offer.minQuantity > 1 && (
            <Text style={styles.limitText}>Min: {offer.minQuantity}</Text>
          )}
          {offer.maxQuantity < 999 && (
            <Text style={styles.limitText}>Max: {offer.maxQuantity}</Text>
          )}
        </View>

        {/* Inactive Status */}
        {!isValid && (
          <View style={styles.inactiveOverlay}>
            <Text style={styles.inactiveText}>Offer Expired</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardInactive: {
    opacity: 0.6,
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: '#F0F0F0',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    lineHeight: 20,
  },
  productCount: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 12,
  },
  pricingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 16,
    color: '#999999',
    textDecorationLine: 'line-through',
    marginRight: 12,
  },
  discountedPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2ECC71',
  },
  savings: {
    fontSize: 14,
    color: '#2ECC71',
    fontWeight: '600',
    marginBottom: 8,
  },
  quantityLimits: {
    flexDirection: 'row',
    gap: 12,
  },
  limitText: {
    fontSize: 12,
    color: '#888888',
    fontStyle: 'italic',
  },
  inactiveOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
