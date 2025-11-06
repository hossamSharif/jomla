/**
 * Firebase Cloud Functions Entry Point
 *
 * This file exports all Cloud Functions for the Jomla grocery store app.
 * Functions are organized by domain:
 * - auth: SMS verification, password reset
 * - orders: Order processing, invoice generation
 * - notifications: Push notification triggers
 * - cart: Cart validation logic
 */

// Authentication Functions
export * from './auth/sendVerificationCode';
export * from './auth/verifyCode';
export * from './auth/resetPassword';

// Cart Functions
export * from './cart/validateCart';
export * from './cart/invalidateCartsOnOfferChange';

// Order Functions
export * from './orders/createOrder';
export * from './orders/generateInvoice';

// Notification Functions
export * from './notifications/sendOfferNotification';
export * from './notifications/sendOrderStatusNotification';

// Admin Functions
export * from './admin/createAdminUser';

// Placeholder function for initial deployment
import * as functions from 'firebase-functions';

export const helloWorld = functions.https.onRequest((request, response) => {
  response.json({message: 'Jomla Cloud Functions are ready!'});
});
