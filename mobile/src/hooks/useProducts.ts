/**
 * React Query Hooks for Products
 *
 * Custom hooks for fetching and managing product data with caching and real-time updates.
 */

import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  getActiveProducts,
  getProductById,
  getProductsByCategory,
  getProductCategories,
  searchProducts,
  subscribeToActiveProducts,
  subscribeToProduct,
} from '../services/productService';
import { Product } from '../../../shared/types/product';

// Query keys for cache management
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: string) => [...productKeys.lists(), { filters }] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  categories: () => [...productKeys.all, 'categories'] as const,
  search: (term: string) => [...productKeys.all, 'search', term] as const,
  byCategory: (category: string) => [...productKeys.lists(), 'category', category] as const,
};

/**
 * Hook to fetch all active products
 * Automatically caches results and provides loading/error states
 */
export function useProducts(): UseQueryResult<Product[], Error> {
  const queryClient = useQueryClient();

  // Fetch products with caching
  const query = useQuery({
    queryKey: productKeys.lists(),
    queryFn: getActiveProducts,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - cache retention (formerly cacheTime)
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToActiveProducts((products) => {
      // Update the cache with real-time data
      queryClient.setQueryData(productKeys.lists(), products);
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  return query;
}

/**
 * Hook to fetch a single product by ID
 * @param productId - The ID of the product to fetch
 * @param enabled - Whether the query should run (default: true)
 */
export function useProduct(
  productId: string,
  enabled: boolean = true
): UseQueryResult<Product | null, Error> {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: productKeys.detail(productId),
    queryFn: () => getProductById(productId),
    enabled: enabled && !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Subscribe to real-time updates for this specific product
  useEffect(() => {
    if (!enabled || !productId) return;

    const unsubscribe = subscribeToProduct(productId, (product) => {
      // Update the cache with real-time data
      queryClient.setQueryData(productKeys.detail(productId), product);
    });

    return () => {
      unsubscribe();
    };
  }, [productId, enabled, queryClient]);

  return query;
}

/**
 * Hook to fetch products by category
 * @param category - Category name to filter by
 * @param enabled - Whether the query should run (default: true)
 */
export function useProductsByCategory(
  category: string,
  enabled: boolean = true
): UseQueryResult<Product[], Error> {
  return useQuery({
    queryKey: productKeys.byCategory(category),
    queryFn: () => getProductsByCategory(category),
    enabled: enabled && !!category,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch product categories
 * Useful for category filters in UI
 */
export function useProductCategories(): UseQueryResult<string[], Error> {
  return useQuery({
    queryKey: productKeys.categories(),
    queryFn: getProductCategories,
    staleTime: 10 * 60 * 1000, // 10 minutes - categories change infrequently
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Hook to search products
 * @param searchTerm - Term to search for
 * @param enabled - Whether the query should run (default: true when searchTerm is not empty)
 */
export function useProductSearch(
  searchTerm: string,
  enabled?: boolean
): UseQueryResult<Product[], Error> {
  const shouldEnable = enabled !== undefined ? enabled : searchTerm.length >= 2;

  return useQuery({
    queryKey: productKeys.search(searchTerm),
    queryFn: () => searchProducts(searchTerm),
    enabled: shouldEnable,
    staleTime: 2 * 60 * 1000, // 2 minutes - search results can be slightly stale
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to get cached products without triggering a new fetch
 * Useful for accessing already-loaded data
 */
export function useCachedProducts(): Product[] | undefined {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<Product[]>(productKeys.lists());
}

/**
 * Hook to get a cached product by ID without triggering a new fetch
 * @param productId - The ID of the product to get from cache
 */
export function useCachedProduct(productId: string): Product | null | undefined {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<Product | null>(productKeys.detail(productId));
}

/**
 * Hook to prefetch a product (useful for optimization)
 * @param productId - The ID of the product to prefetch
 */
export function usePrefetchProduct(productId: string): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (productId) {
      queryClient.prefetchQuery({
        queryKey: productKeys.detail(productId),
        queryFn: () => getProductById(productId),
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [productId, queryClient]);
}

/**
 * Hook to invalidate products cache
 * Forces a refetch on next access
 */
export function useInvalidateProducts(): () => Promise<void> {
  const queryClient = useQueryClient();

  return async () => {
    await queryClient.invalidateQueries({ queryKey: productKeys.all });
  };
}
