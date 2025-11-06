/**
 * CartProductItem Component
 *
 * Displays an individual product item in the cart.
 * Shows quantity controls, pricing, and remove functionality.
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { CartProductItem as CartProductItemType } from '../../../../shared/types/cart';
import { useCartStore } from '../../store';
import { formatPrice } from '../../utils/cartValidation';

interface CartProductItemProps {
  item: CartProductItemType;
}

export function CartProductItem({ item }: CartProductItemProps) {
  const { updateProductQuantity, removeProductItem } = useCartStore();

  const handleIncreaseQuantity = () => {
    updateProductQuantity(item.productId, item.quantity + 1);
  };

  const handleDecreaseQuantity = () => {
    if (item.quantity > 1) {
      updateProductQuantity(item.productId, item.quantity - 1);
    }
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove Item',
      `Remove "${item.productName}" from cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeProductItem(item.productId),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Product Image */}
      <View style={styles.imageContainer}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
      </View>

      {/* Product Details */}
      <View style={styles.details}>
        {/* Product Name */}
        <Text style={styles.name} numberOfLines={2}>
          {item.productName}
        </Text>

        {/* Unit Price */}
        <Text style={styles.unitPrice}>
          {formatPrice(item.pricePerUnit)} each
        </Text>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Quantity Controls */}
          <View style={styles.quantityControl}>
            <TouchableOpacity
              style={[styles.quantityButton, item.quantity <= 1 && styles.quantityButtonDisabled]}
              onPress={handleDecreaseQuantity}
              disabled={item.quantity <= 1}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>

            <Text style={styles.quantityText}>{item.quantity}</Text>

            <TouchableOpacity
              style={styles.quantityButton}
              onPress={handleIncreaseQuantity}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Total Price */}
          <Text style={styles.totalPrice}>
            {formatPrice(item.totalPrice)}
          </Text>
        </View>

        {/* Remove Button */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={handleRemove}
        >
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
    marginRight: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
  },
  placeholderText: {
    color: '#999999',
    fontSize: 10,
  },
  details: {
    flex: 1,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  unitPrice: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  quantityButtonDisabled: {
    opacity: 0.3,
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  quantityText: {
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 14,
    minWidth: 36,
    textAlign: 'center',
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2ECC71',
  },
  removeButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  removeButtonText: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '600',
  },
});
