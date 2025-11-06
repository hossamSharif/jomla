/**
 * React Query Configuration
 *
 * Configures TanStack Query for data fetching and caching with offline persistence.
 */

import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create a QueryClient instance with custom configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,

      // Cache time: Unused data is garbage collected after 30 minutes (for offline support)
      gcTime: 30 * 60 * 1000,

      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on window focus in production only
      refetchOnWindowFocus: process.env.EXPO_PUBLIC_ENVIRONMENT === 'production',

      // Refetch on reconnect
      refetchOnReconnect: true,

      // Refetch on mount if data is stale
      refetchOnMount: true,

      // Network mode: online-first (fail if offline)
      networkMode: 'online',
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,

      // Network mode for mutations
      networkMode: 'online',
    },
  },
});

// Create AsyncStorage persister for offline caching
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  // Serialize/deserialize to handle Firestore Timestamps
  serialize: (data) => {
    try {
      return JSON.stringify(data, (key, value) => {
        // Handle Firestore Timestamps
        if (value && typeof value === 'object' && value.toMillis) {
          return {
            _type: 'Timestamp',
            seconds: Math.floor(value.toMillis() / 1000),
            nanoseconds: (value.toMillis() % 1000) * 1000000,
          };
        }
        return value;
      });
    } catch (error) {
      console.error('Error serializing cache data:', error);
      return JSON.stringify({}); // Fallback to empty object
    }
  },
  deserialize: (cachedString) => {
    try {
      return JSON.parse(cachedString, (key, value) => {
        // Restore Firestore Timestamps
        if (value && value._type === 'Timestamp') {
          // Return as plain object with toMillis method
          const millis = value.seconds * 1000 + Math.floor(value.nanoseconds / 1000000);
          return {
            seconds: value.seconds,
            nanoseconds: value.nanoseconds,
            toMillis: () => millis,
            toDate: () => new Date(millis),
          };
        }
        return value;
      });
    } catch (error) {
      console.error('Error deserializing cache data:', error);
      return {}; // Fallback to empty object
    }
  },
  throttleTime: 1000, // Throttle writes to storage
});

// Persistence options
export const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours - cache expires after this time
  dehydrateOptions: {
    // Don't persist queries that failed
    shouldDehydrateQuery: (query: any) => {
      return query.state.status === 'success';
    },
  },
};

// Query keys factory for consistent key management
export const queryKeys = {
  // Products
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
  },

  // Offers
  offers: {
    all: ['offers'] as const,
    lists: () => [...queryKeys.offers.all, 'list'] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.offers.lists(), filters] as const,
    details: () => [...queryKeys.offers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.offers.details(), id] as const,
  },

  // Cart
  cart: {
    all: ['cart'] as const,
    user: (userId: string) => [...queryKeys.cart.all, userId] as const,
  },

  // Orders
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (userId: string, filters?: Record<string, any>) =>
      [...queryKeys.orders.lists(), userId, filters] as const,
    details: () => [...queryKeys.orders.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.orders.details(), id] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    list: (userId: string, filters?: Record<string, any>) =>
      [...queryKeys.notifications.lists(), userId, filters] as const,
  },

  // User
  user: {
    all: ['user'] as const,
    profile: (userId: string) => [...queryKeys.user.all, 'profile', userId] as const,
  },
};

// Helper function to invalidate all queries
export const invalidateAllQueries = () => {
  return queryClient.invalidateQueries();
};

// Helper function to invalidate specific entity queries
export const invalidateEntityQueries = (entity: keyof typeof queryKeys) => {
  return queryClient.invalidateQueries({ queryKey: queryKeys[entity].all });
};

// Helper function to prefetch query
export const prefetchQuery = async <T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>
) => {
  return queryClient.prefetchQuery({ queryKey, queryFn });
};

// Helper function to set query data
export const setQueryData = <T>(queryKey: readonly unknown[], data: T) => {
  return queryClient.setQueryData(queryKey, data);
};

// Helper function to get query data
export const getQueryData = <T>(queryKey: readonly unknown[]): T | undefined => {
  return queryClient.getQueryData(queryKey);
};

export default queryClient;
