/**
 * Firebase Analytics Service
 *
 * Tracks key user actions and events throughout the mobile app.
 * Analytics help understand user behavior and improve the app.
 */

import { getAnalytics, logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { app } from './firebase';

// Initialize Analytics (only on web/production)
let analytics: ReturnType<typeof getAnalytics> | null = null;

try {
  // Analytics only works in web context for Expo apps
  // For native, use Firebase SDK separately
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
} catch (error) {
  console.log('Analytics not available in this environment');
}

/**
 * Analytics Event Names
 */
export const AnalyticsEvents = {
  // Authentication
  SIGN_UP: 'sign_up',
  LOGIN: 'login',
  LOGOUT: 'logout',

  // Product Browsing
  VIEW_ITEM: 'view_item',
  VIEW_ITEM_LIST: 'view_item_list',
  SEARCH: 'search',

  // Offers
  VIEW_OFFER: 'view_offer',
  VIEW_OFFER_LIST: 'view_offer_list',

  // Cart Actions
  ADD_TO_CART: 'add_to_cart',
  REMOVE_FROM_CART: 'remove_from_cart',
  VIEW_CART: 'view_cart',

  // Checkout
  BEGIN_CHECKOUT: 'begin_checkout',
  ADD_SHIPPING_INFO: 'add_shipping_info',
  ADD_PAYMENT_INFO: 'add_payment_info',
  PURCHASE: 'purchase',

  // Orders
  VIEW_ORDER: 'view_order',
  VIEW_ORDER_LIST: 'view_order_list',

  // Profile
  UPDATE_PROFILE: 'update_profile',

  // Notifications
  NOTIFICATION_RECEIVED: 'notification_received',
  NOTIFICATION_OPENED: 'notification_opened',
} as const;

/**
 * Track user authentication
 */
export function trackSignUp(method: string = 'email'): void {
  if (!analytics) return;

  logEvent(analytics, AnalyticsEvents.SIGN_UP, {
    method,
  });
}

export function trackLogin(method: string = 'email'): void {
  if (!analytics) return;

  logEvent(analytics, AnalyticsEvents.LOGIN, {
    method,
  });
}

export function trackLogout(): void {
  if (!analytics) return;

  logEvent(analytics, AnalyticsEvents.LOGOUT);
}

/**
 * Set user properties
 */
export function setAnalyticsUserId(userId: string): void {
  if (!analytics) return;

  setUserId(analytics, userId);
}

export function setAnalyticsUserProperties(properties: Record<string, string>): void {
  if (!analytics) return;

  setUserProperties(analytics, properties);
}

/**
 * Track product viewing
 */
export function trackViewProduct(productId: string, productName: string, price: number, category?: string): void {
  if (!analytics) return;

  logEvent(analytics, AnalyticsEvents.VIEW_ITEM, {
    item_id: productId,
    item_name: productName,
    price: price / 100, // Convert cents to dollars
    currency: 'USD',
    item_category: category,
  });
}

export function trackViewProductList(category?: string): void {
  if (!analytics) return;

  logEvent(analytics, AnalyticsEvents.VIEW_ITEM_LIST, {
    item_list_name: category || 'All Products',
  });
}

/**
 * Track offer viewing
 */
export function trackViewOffer(
  offerId: string,
  offerName: string,
  discountedTotal: number,
  originalTotal: number
): void {
  if (!analytics) return;

  logEvent(analytics, AnalyticsEvents.VIEW_OFFER, {
    offer_id: offerId,
    offer_name: offerName,
    price: discountedTotal / 100,
    original_price: originalTotal / 100,
    discount: (originalTotal - discountedTotal) / 100,
    currency: 'USD',
  });
}

export function trackViewOfferList(): void {
  if (!analytics) return;

  logEvent(analytics, AnalyticsEvents.VIEW_OFFER_LIST);
}

/**
 * Track cart actions
 */
export function trackAddToCart(
  itemId: string,
  itemName: string,
  itemType: 'product' | 'offer',
  price: number,
  quantity: number
): void {
  if (!analytics) return;

  logEvent(analytics, AnalyticsEvents.ADD_TO_CART, {
    item_id: itemId,
    item_name: itemName,
    item_type: itemType,
    price: price / 100,
    quantity,
    currency: 'USD',
    value: (price * quantity) / 100,
  });
}

export function trackRemoveFromCart(
  itemId: string,
  itemName: string,
  itemType: 'product' | 'offer',
  price: number,
  quantity: number
): void {
  if (!analytics) return;

  logEvent(analytics, AnalyticsEvents.REMOVE_FROM_CART, {
    item_id: itemId,
    item_name: itemName,
    item_type: itemType,
    price: price / 100,
    quantity,
    currency: 'USD',
    value: (price * quantity) / 100,
  });
}

export function trackViewCart(cartTotal: number, itemCount: number): void {
  if (!analytics) return;

  logEvent(analytics, AnalyticsEvents.VIEW_CART, {
    value: cartTotal / 100,
    currency: 'USD',
    item_count: itemCount,
  });
}

/**
 * Track checkout process
 */
export function trackBeginCheckout(cartTotal: number, itemCount: number): void {
  if (!analytics) return;

  logEvent(analytics, AnalyticsEvents.BEGIN_CHECKOUT, {
    value: cartTotal / 100,
    currency: 'USD',
    item_count: itemCount,
  });
}

export function trackAddShippingInfo(shippingMethod: 'delivery' | 'pickup'): void {
  if (!analytics) return;

  logEvent(analytics, AnalyticsEvents.ADD_SHIPPING_INFO, {
    shipping_tier: shippingMethod,
  });
}

export function trackPurchase(
  orderId: string,
  orderTotal: number,
  tax: number,
  shipping: number,
  itemCount: number
): void {
  if (!analytics) return;

  logEvent(analytics, AnalyticsEvents.PURCHASE, {
    transaction_id: orderId,
    value: orderTotal / 100,
    tax: tax / 100,
    shipping: shipping / 100,
    currency: 'USD',
    item_count: itemCount,
  });
}

/**
 * Track order viewing
 */
export function trackViewOrder(orderId: string, orderStatus: string): void {
  if (!analytics) return;

  logEvent(analytics, AnalyticsEvents.VIEW_ORDER, {
    order_id: orderId,
    order_status: orderStatus,
  });
}

export function trackViewOrderList(): void {
  if (!analytics) return;

  logEvent(analytics, AnalyticsEvents.VIEW_ORDER_LIST);
}

/**
 * Track search
 */
export function trackSearch(searchTerm: string): void {
  if (!analytics) return;

  logEvent(analytics, AnalyticsEvents.SEARCH, {
    search_term: searchTerm,
  });
}

/**
 * Track notifications
 */
export function trackNotificationReceived(notificationType: string): void {
  if (!analytics) return;

  logEvent(analytics, AnalyticsEvents.NOTIFICATION_RECEIVED, {
    notification_type: notificationType,
  });
}

export function trackNotificationOpened(notificationType: string, targetId?: string): void {
  if (!analytics) return;

  logEvent(analytics, AnalyticsEvents.NOTIFICATION_OPENED, {
    notification_type: notificationType,
    target_id: targetId,
  });
}

/**
 * Track custom events
 */
export function trackCustomEvent(eventName: string, params?: Record<string, any>): void {
  if (!analytics) return;

  logEvent(analytics, eventName, params);
}

/**
 * Screen view tracking (for navigation)
 */
export function trackScreenView(screenName: string, screenClass?: string): void {
  if (!analytics) return;

  logEvent(analytics, 'screen_view', {
    firebase_screen: screenName,
    firebase_screen_class: screenClass || screenName,
  });
}
