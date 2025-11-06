/**
 * ProductCard Component
 *
 * Displays an individual product with image, name, price, and availability.
 * Shows quantity limits and stock status.
 * Includes "Add to Cart" functionality with quantity controls.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Product } from '../../../shared/types/product';
import { formatProductPrice, isProductAvailable } from '../services/productService';
import { router } from 'expo-router';
import { useCartStore } from '../store';
import { CartProductItem } from '../../../shared/types/cart';
import { canAddToCart } from '../utils/cartValidation';

interface ProductCardProps {
  product: Product;
  onPress?: (product: Product) => void;
  showAddToCart?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with 16px outer margins and 16px gap

export function ProductCard({ product, onPress, showAddToCart = true }: ProductCardProps) {
  const [quantity, setQuantity] = useState(product.minQuantity || 1);
  const { cart, addProductItem } = useCartStore();

  const handlePress = () => {
    if (onPress) {
      onPress(product);
    } else {
      // Navigate to product details screen if implemented
      // For now, just log
      console.log('Product pressed:', product.id);
    }
  };

  const handleAddToCart = (e: any) => {
    // Prevent navigation when clicking add to cart
    e.stopPropagation();

    // Validate quantity
    const validation = canAddToCart(
      product.id,
      quantity,
      cart,
      product.maxQuantity,
      product.minQuantity
    );

    if (!validation.canAdd) {
      Alert.alert('Cannot Add to Cart', validation.reason || 'Invalid quantity');
      return;
    }

    // Create cart product item
    const cartItem: CartProductItem = {
      productId: product.id,
      productName: product.name,
      quantity,
      pricePerUnit: product.basePrice,
      totalPrice: product.basePrice * quantity,
      imageUrl: product.thumbnailUrl || product.imageUrl,
    };

    addProductItem(cartItem);

    Alert.alert(
      'Added to Cart',
      `${product.name} (x${quantity}) has been added to your cart.`,
      [
        { text: 'Continue Shopping', style: 'cancel' },
        { text: 'View Cart', onPress: () => router.push('/cart') },
      ]
    );

    // Reset quantity to minimum
    setQuantity(product.minQuantity || 1);
  };

  const handleIncreaseQuantity = (e: any) => {
    e.stopPropagation();
    if (quantity < product.maxQuantity) {
      setQuantity(quantity + 1);
    }
  };

  const handleDecreaseQuantity = (e: any) => {
    e.stopPropagation();
    if (quantity > product.minQuantity) {
      setQuantity(quantity - 1);
    }
  };

  const isAvailable = isProductAvailable(product);
  const price = formatProductPrice(product.basePrice);

  return (
    <TouchableOpacity
      style={[styles.card, !isAvailable && styles.cardInactive]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={!isAvailable}
    >
      {/* Product Image */}
      <View style={styles.imageContainer}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.thumbnailUrl || product.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        {/* Stock Status Badge */}
        {!product.inStock && (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Product Name */}
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Category */}
        <Text style={styles.category} numberOfLines={1}>
          {product.category}
        </Text>

        {/* Price */}
        <Text style={styles.price}>{price}</Text>

        {/* Quantity Limits */}
        {(product.minQuantity > 1 || product.maxQuantity < 999) && (
          <View style={styles.quantityLimits}>
            {product.minQuantity > 1 && (
              <Text style={styles.limitText}>Min: {product.minQuantity}</Text>
            )}
            {product.maxQuantity < 999 && (
              <Text style={styles.limitText}>Max: {product.maxQuantity}</Text>
            )}
          </View>
        )}

        {/* Add to Cart Section */}
        {showAddToCart && isAvailable && (
          <View style={styles.addToCartSection}>
            {/* Quantity Controls */}
            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={[styles.quantityButton, quantity <= product.minQuantity && styles.quantityButtonDisabled]}
                onPress={handleDecreaseQuantity}
                disabled={quantity <= product.minQuantity}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>

              <Text style={styles.quantityText}>{quantity}</Text>

              <TouchableOpacity
                style={[styles.quantityButton, quantity >= product.maxQuantity && styles.quantityButtonDisabled]}
                onPress={handleIncreaseQuantity}
                disabled={quantity >= product.maxQuantity}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Add to Cart Button */}
            <TouchableOpacity
              style={styles.addToCartButton}
              onPress={handleAddToCart}
              activeOpacity={0.8}
            >
              <Text style={styles.addToCartButtonText}>+</Text>
            </TouchableOpacity>
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
    marginBottom: 16,
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
  imageContainer: {
    width: '100%',
    height: CARD_WIDTH * 0.8, // Maintain aspect ratio
    backgroundColor: '#F0F0F0',
    position: 'relative',
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
    fontSize: 12,
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  outOfStockText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
    minHeight: 36, // Reserve space for 2 lines
  },
  category: {
    fontSize: 11,
    color: '#888888',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2ECC71',
    marginBottom: 4,
  },
  quantityLimits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  limitText: {
    fontSize: 10,
    color: '#888888',
    fontStyle: 'italic',
  },
  addToCartSection: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  quantityButtonDisabled: {
    opacity: 0.3,
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 10,
    minWidth: 30,
    textAlign: 'center',
  },
  addToCartButton: {
    width: 32,
    height: 32,
    backgroundColor: '#2ECC71',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
});
