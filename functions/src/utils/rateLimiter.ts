/**
 * Rate Limiting Utility for Cloud Functions
 *
 * Implements token bucket algorithm for rate limiting using Firestore.
 * Prevents abuse by limiting the number of requests per time window.
 */

import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

const db = admin.firestore();

export interface RateLimitConfig {
  maxRequests: number; // Maximum requests allowed
  windowMs: number; // Time window in milliseconds
  keyPrefix?: string; // Prefix for rate limit keys
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // Seconds to wait before retrying
}

/**
 * Check rate limit for a given identifier (user ID, IP, etc.)
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const {
    maxRequests,
    windowMs,
    keyPrefix = 'rateLimit',
  } = config;

  const key = `${keyPrefix}:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  const rateLimitRef = db.collection('rateLimits').doc(key);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);

      if (!doc.exists) {
        // First request - create new rate limit record
        transaction.set(rateLimitRef, {
          requests: [now],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
          allowed: true,
          remaining: maxRequests - 1,
          resetAt: new Date(now + windowMs),
        };
      }

      const data = doc.data()!;
      const requests: number[] = data.requests || [];

      // Filter out requests outside the current window
      const validRequests = requests.filter((timestamp) => timestamp > windowStart);

      if (validRequests.length >= maxRequests) {
        // Rate limit exceeded
        const oldestRequest = Math.min(...validRequests);
        const resetAt = new Date(oldestRequest + windowMs);
        const retryAfter = Math.ceil((resetAt.getTime() - now) / 1000);

        return {
          allowed: false,
          remaining: 0,
          resetAt,
          retryAfter,
        };
      }

      // Add current request
      validRequests.push(now);

      transaction.update(rateLimitRef, {
        requests: validRequests,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        allowed: true,
        remaining: maxRequests - validRequests.length,
        resetAt: new Date(now + windowMs),
      };
    });

    return result;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow request if rate limiting check fails
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: new Date(now + windowMs),
    };
  }
}

/**
 * Rate limit middleware for HTTP callable functions
 */
export async function rateLimitMiddleware(
  identifier: string,
  config: RateLimitConfig
): Promise<void> {
  const result = await checkRateLimit(identifier, config);

  if (!result.allowed) {
    throw new HttpsError(
      'resource-exhausted',
      `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
      {
        retryAfter: result.retryAfter,
        resetAt: result.resetAt.toISOString(),
      }
    );
  }
}

/**
 * Predefined rate limit configurations
 */
export const RateLimits = {
  // SMS verification: 3 attempts per hour
  SMS_VERIFICATION: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'sms',
  },

  // Password reset: 5 attempts per hour
  PASSWORD_RESET: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'passwordReset',
  },

  // Order creation: 10 orders per hour per user
  ORDER_CREATION: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'orderCreate',
  },

  // General API calls: 100 requests per minute per user
  GENERAL_API: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'api',
  },

  // Admin actions: 1000 requests per hour
  ADMIN_API: {
    maxRequests: 1000,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'adminApi',
  },

  // Public endpoints (by IP): 50 requests per minute
  PUBLIC_IP: {
    maxRequests: 50,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'publicIp',
  },
};

/**
 * Clean up old rate limit records (call periodically via scheduled function)
 */
export async function cleanupRateLimits(): Promise<void> {
  const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
  const cutoffDate = admin.firestore.Timestamp.fromMillis(cutoffTime);

  try {
    const oldRecords = await db
      .collection('rateLimits')
      .where('updatedAt', '<', cutoffDate)
      .limit(500)
      .get();

    if (oldRecords.empty) {
      console.log('No old rate limit records to clean up');
      return;
    }

    const batch = db.batch();
    oldRecords.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Cleaned up ${oldRecords.size} old rate limit records`);
  } catch (error) {
    console.error('Failed to cleanup rate limits:', error);
  }
}

/**
 * Get rate limit status for an identifier (for debugging/monitoring)
 */
export async function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig
): Promise<{
  requestCount: number;
  remaining: number;
  resetAt: Date;
}> {
  const { maxRequests, windowMs, keyPrefix = 'rateLimit' } = config;
  const key = `${keyPrefix}:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  const doc = await db.collection('rateLimits').doc(key).get();

  if (!doc.exists) {
    return {
      requestCount: 0,
      remaining: maxRequests,
      resetAt: new Date(now + windowMs),
    };
  }

  const data = doc.data()!;
  const requests: number[] = data.requests || [];
  const validRequests = requests.filter((timestamp) => timestamp > windowStart);

  const oldestRequest = validRequests.length > 0 ? Math.min(...validRequests) : now;

  return {
    requestCount: validRequests.length,
    remaining: Math.max(0, maxRequests - validRequests.length),
    resetAt: new Date(oldestRequest + windowMs),
  };
}

/**
 * Reset rate limit for an identifier (admin/support use)
 */
export async function resetRateLimit(
  identifier: string,
  keyPrefix: string = 'rateLimit'
): Promise<void> {
  const key = `${keyPrefix}:${identifier}`;
  await db.collection('rateLimits').doc(key).delete();
}
