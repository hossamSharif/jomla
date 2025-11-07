import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Skeleton loading component with shimmer animation
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * Skeleton for card components
 */
export const CardSkeleton: React.FC = () => {
  return (
    <View style={styles.card}>
      <Skeleton width="100%" height={200} borderRadius={8} style={styles.image} />
      <View style={styles.content}>
        <Skeleton width="80%" height={20} style={styles.title} />
        <Skeleton width="60%" height={16} style={styles.subtitle} />
        <View style={styles.footer}>
          <Skeleton width={80} height={24} borderRadius={4} />
          <Skeleton width={100} height={36} borderRadius={18} />
        </View>
      </View>
    </View>
  );
};

/**
 * Skeleton for product card
 */
export const ProductCardSkeleton: React.FC = () => {
  return (
    <View style={styles.productCard}>
      <Skeleton width="100%" height={150} borderRadius={8} />
      <Skeleton width="90%" height={18} style={{ marginTop: 8 }} />
      <Skeleton width="60%" height={16} style={{ marginTop: 4 }} />
    </View>
  );
};

/**
 * Skeleton for offer card
 */
export const OfferCardSkeleton: React.FC = () => {
  return (
    <View style={styles.offerCard}>
      <Skeleton width="100%" height={200} borderRadius={12} style={styles.offerImage} />
      <View style={styles.offerContent}>
        <Skeleton width="70%" height={22} style={{ marginBottom: 8 }} />
        <Skeleton width="100%" height={16} style={{ marginBottom: 4 }} />
        <Skeleton width="80%" height={16} style={{ marginBottom: 12 }} />
        <View style={styles.offerFooter}>
          <Skeleton width={100} height={28} />
          <Skeleton width={120} height={40} borderRadius={20} />
        </View>
      </View>
    </View>
  );
};

/**
 * Skeleton for list items
 */
export const ListItemSkeleton: React.FC = () => {
  return (
    <View style={styles.listItem}>
      <Skeleton width={60} height={60} borderRadius={8} />
      <View style={styles.listItemContent}>
        <Skeleton width="80%" height={18} style={{ marginBottom: 8 }} />
        <Skeleton width="60%" height={14} />
      </View>
      <Skeleton width={40} height={40} borderRadius={20} />
    </View>
  );
};

/**
 * Skeleton for text paragraphs
 */
export const TextSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => {
  return (
    <View>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? '70%' : '100%'}
          height={16}
          style={{ marginBottom: 8 }}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E1E9EE',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    marginBottom: 0,
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  offerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  offerImage: {
    marginBottom: 0,
  },
  offerContent: {
    padding: 16,
  },
  offerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  listItemContent: {
    flex: 1,
    marginLeft: 16,
  },
});
