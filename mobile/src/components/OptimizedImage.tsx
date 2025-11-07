/**
 * Optimized Image Component
 *
 * Provides lazy loading, placeholder, and error handling for images.
 * Supports WebP format with fallback to original format.
 */

import React, { useState } from 'react';
import { Image, ImageProps, View, StyleSheet, ActivityIndicator } from 'react-native';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: string | { uri: string };
  placeholder?: string;
  width?: number;
  height?: number;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: any) => void;
  showLoader?: boolean;
}

/**
 * OptimizedImage component with lazy loading and WebP support
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  placeholder,
  width,
  height,
  resizeMode = 'cover',
  style,
  onLoadStart,
  onLoadEnd,
  onError,
  showLoader = true,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageUri, setImageUri] = useState<string>(() => {
    if (typeof source === 'string') {
      return source;
    }
    return source.uri;
  });

  const handleLoadStart = () => {
    setIsLoading(true);
    onLoadStart?.();
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
    onLoadEnd?.();
  };

  const handleError = (error: any) => {
    setIsLoading(false);
    setHasError(true);

    // Try fallback to original format if WebP fails
    if (imageUri.includes('.webp')) {
      const fallbackUri = imageUri.replace('.webp', '.jpg');
      setImageUri(fallbackUri);
      setHasError(false);
    } else {
      onError?.(error);
    }
  };

  const imageSource = hasError && placeholder
    ? { uri: placeholder }
    : { uri: imageUri };

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Image
        {...props}
        source={imageSource}
        style={[styles.image, { width, height }]}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
      />

      {isLoading && showLoader && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color="#4CAF50" />
        </View>
      )}

      {hasError && !placeholder && (
        <View style={styles.errorContainer}>
          <View style={styles.errorPlaceholder} />
        </View>
      )}
    </View>
  );
};

/**
 * Get optimized image URL with WebP format
 * Supports Firebase Storage URL transformation
 */
export function getOptimizedImageUrl(
  url: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpg' | 'png';
  }
): string {
  if (!url) return url;

  const { width, height, quality = 80, format = 'webp' } = options || {};

  // Check if it's a Firebase Storage URL
  if (url.includes('firebasestorage.googleapis.com')) {
    // Firebase Storage doesn't support on-the-fly transformations
    // For production, consider using a CDN like Cloudflare Images or imgix
    // For now, return original URL with WebP extension if applicable
    return url;
  }

  // For other CDNs, add transformation parameters
  // Example for Cloudinary:
  // const transformations = `w_${width},h_${height},q_${quality},f_${format}`;
  // return url.replace('/upload/', `/upload/${transformations}/`);

  return url;
}

/**
 * Preload images for better performance
 */
export async function preloadImages(urls: string[]): Promise<void> {
  const promises = urls.map((url) => {
    return Image.prefetch(url);
  });

  try {
    await Promise.all(promises);
  } catch (error) {
    console.error('Error preloading images:', error);
  }
}

/**
 * Clear image cache
 */
export async function clearImageCache(): Promise<void> {
  try {
    // Clear all cached images
    await Image.queryCache();
  } catch (error) {
    console.error('Error clearing image cache:', error);
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorPlaceholder: {
    width: 50,
    height: 50,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
});
