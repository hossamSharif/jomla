/**
 * ProductCard Component
 *
 * Displays an individual product with image, name, price, and availability.
 * Shows quantity limits and stock status.
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
import { Product } from '../../../shared/types/product';
import { formatProductPrice, isProductAvailable } from '../services/productService';
import { router } from 'expo-router';

interface ProductCardProps {
  product: Product;
  onPress?: (product: Product) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with 16px outer margins and 16px gap

export function ProductCard({ product, onPress }: ProductCardProps) {
  const handlePress = () => {
    if (onPress) {
      onPress(product);
    } else {
      // Navigate to product details screen if implemented
      // For now, just log
      console.log('Product pressed:', product.id);
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
});
