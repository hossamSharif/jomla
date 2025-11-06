/**
 * React Query Hooks for Offers
 *
 * Custom hooks for fetching and managing offer data with caching and real-time updates.
 */

import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  getActiveOffers,
  getOfferById,
  subscribeToActiveOffers,
  subscribeToOffer,
} from '../services/offerService';
import { Offer } from '../../../shared/types/offer';

// Query keys for cache management
export const offerKeys = {
  all: ['offers'] as const,
  lists: () => [...offerKeys.all, 'list'] as const,
  list: (filters: string) => [...offerKeys.lists(), { filters }] as const,
  details: () => [...offerKeys.all, 'detail'] as const,
  detail: (id: string) => [...offerKeys.details(), id] as const,
};

/**
 * Hook to fetch all active offers
 * Automatically caches results and provides loading/error states
 */
export function useOffers(): UseQueryResult<Offer[], Error> {
  const queryClient = useQueryClient();

  // Fetch offers with caching
  const query = useQuery({
    queryKey: offerKeys.lists(),
    queryFn: getActiveOffers,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - cache retention (formerly cacheTime)
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToActiveOffers((offers) => {
      // Update the cache with real-time data
      queryClient.setQueryData(offerKeys.lists(), offers);
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  return query;
}

/**
 * Hook to fetch a single offer by ID
 * @param offerId - The ID of the offer to fetch
 * @param enabled - Whether the query should run (default: true)
 */
export function useOffer(
  offerId: string,
  enabled: boolean = true
): UseQueryResult<Offer | null, Error> {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: offerKeys.detail(offerId),
    queryFn: () => getOfferById(offerId),
    enabled: enabled && !!offerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Subscribe to real-time updates for this specific offer
  useEffect(() => {
    if (!enabled || !offerId) return;

    const unsubscribe = subscribeToOffer(offerId, (offer) => {
      // Update the cache with real-time data
      queryClient.setQueryData(offerKeys.detail(offerId), offer);
    });

    return () => {
      unsubscribe();
    };
  }, [offerId, enabled, queryClient]);

  return query;
}

/**
 * Hook to get cached offers without triggering a new fetch
 * Useful for accessing already-loaded data
 */
export function useCachedOffers(): Offer[] | undefined {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<Offer[]>(offerKeys.lists());
}

/**
 * Hook to get a cached offer by ID without triggering a new fetch
 * @param offerId - The ID of the offer to get from cache
 */
export function useCachedOffer(offerId: string): Offer | null | undefined {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<Offer | null>(offerKeys.detail(offerId));
}

/**
 * Hook to prefetch an offer (useful for optimization)
 * @param offerId - The ID of the offer to prefetch
 */
export function usePrefetchOffer(offerId: string): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (offerId) {
      queryClient.prefetchQuery({
        queryKey: offerKeys.detail(offerId),
        queryFn: () => getOfferById(offerId),
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [offerId, queryClient]);
}

/**
 * Hook to invalidate offers cache
 * Forces a refetch on next access
 */
export function useInvalidateOffers(): () => Promise<void> {
  const queryClient = useQueryClient();

  return async () => {
    await queryClient.invalidateQueries({ queryKey: offerKeys.all });
  };
}
