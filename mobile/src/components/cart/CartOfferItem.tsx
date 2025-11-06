/**
 * CartOfferItem Component
 *
 * Displays an offer item in the cart with product breakdown.
 * Shows quantity controls, pricing, and remove functionality.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { CartOfferItem as CartOfferItemType } from '../../../../shared/types/cart';
import { useCartStore } from '../../store';
import { formatPrice } from '../../utils/cartValidation';

interface CartOfferItemProps {
  item: CartOfferItemType;
  isInvalid?: boolean;
}

export function CartOfferItem({ item, isInvalid = false }: CartOfferItemProps) {
  const { updateOfferQuantity, removeOfferItem } = useCartStore();

  const handleIncreaseQuantity = () => {
    updateOfferQuantity(item.offerId, item.quantity + 1);
  };

  const handleDecreaseQuantity = () => {
    if (item.quantity > 1) {
      updateOfferQuantity(item.offerId, item.quantity - 1);
    }
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove Item',
      `Remove "${item.offerName}" from cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeOfferItem(item.offerId),
        },
      ]
    );
  };

  const unitPrice = item.discountedTotal / item.quantity;
  const originalUnitPrice = item.originalTotal / item.quantity;
  const savings = item.originalTotal - item.discountedTotal;

  return (
    <View style={[styles.container, isInvalid && styles.containerInvalid]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.offerBadge}>
          <Text style={styles.offerBadgeText}>OFFER</Text>
        </View>
        <Text style={styles.name}>{item.offerName}</Text>
      </View>

      {/* Invalid Warning */}
      {isInvalid && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            This offer has been modified or is no longer available. Please remove it from your cart.
          </Text>
        </View>
      )}

      {/* Product Breakdown */}
      <View style={styles.productsSection}>
        <Text style={styles.productsSectionTitle}>Includes:</Text>
        {item.products.map((product, index) => (
          <View key={index} style={styles.productRow}>
            <Text style={styles.productName}>• {product.productName}</Text>
            <View style={styles.productPricing}>
              <Text style={styles.productOriginalPrice}>
                {formatPrice(product.basePrice)}
              </Text>
              <Text style={styles.productDiscountedPrice}>
                {formatPrice(product.discountedPrice)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Pricing */}
      <View style={styles.pricingSection}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Unit Price:</Text>
          <View style={styles.priceValues}>
            <Text style={styles.originalPrice}>{formatPrice(originalUnitPrice)}</Text>
            <Text style={styles.discountedPrice}>{formatPrice(unitPrice)}</Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.savingsLabel}>Savings per unit:</Text>
          <Text style={styles.savingsAmount}>
            {formatPrice(originalUnitPrice - unitPrice)}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Quantity Controls */}
        <View style={styles.quantityControl}>
          <TouchableOpacity
            style={[styles.quantityButton, item.quantity <= 1 && styles.quantityButtonDisabled]}
            onPress={handleDecreaseQuantity}
            disabled={item.quantity <= 1 || isInvalid}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>

          <Text style={styles.quantityText}>{item.quantity}</Text>

          <TouchableOpacity
            style={styles.quantityButton}
            onPress={handleIncreaseQuantity}
            disabled={isInvalid}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total:</Text>
          <View style={styles.totalPrices}>
            <Text style={styles.totalOriginalPrice}>
              {formatPrice(item.originalTotal)}
            </Text>
            <Text style={styles.totalDiscountedPrice}>
              {formatPrice(item.discountedTotal)}
            </Text>
          </View>
        </View>

        {/* Remove Button */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={handleRemove}
        >
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>

      {/* Total Savings */}
      <View style={styles.savingsBanner}>
        <Text style={styles.savingsBannerText}>
          You save {formatPrice(savings)} with this offer!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#2ECC71',
  },
  containerInvalid: {
    borderColor: '#FF6B6B',
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  offerBadge: {
    backgroundColor: '#2ECC71',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  offerBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },
  warningBanner: {
    backgroundColor: '#FFF3CD',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
  productsSection: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  productsSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  productName: {
    fontSize: 13,
    color: '#333333',
    flex: 1,
  },
  productPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productOriginalPrice: {
    fontSize: 12,
    color: '#999999',
    textDecorationLine: 'line-through',
  },
  productDiscountedPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2ECC71',
  },
  pricingSection: {
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666666',
  },
  priceValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: '#999999',
    textDecorationLine: 'line-through',
  },
  discountedPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2ECC71',
  },
  savingsLabel: {
    fontSize: 13,
    color: '#666666',
    fontStyle: 'italic',
  },
  savingsAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2ECC71',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  quantityButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  quantityButtonDisabled: {
    opacity: 0.3,
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    minWidth: 40,
    textAlign: 'center',
  },
  totalSection: {
    flex: 1,
    marginLeft: 12,
  },
  totalLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  totalPrices: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalOriginalPrice: {
    fontSize: 14,
    color: '#999999',
    textDecorationLine: 'line-through',
  },
  totalDiscountedPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2ECC71',
  },
  removeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  removeButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  savingsBanner: {
    backgroundColor: '#D4EDDA',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  savingsBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#155724',
  },
});
