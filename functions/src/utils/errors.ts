/**
 * Error Handling Utility for Cloud Functions
 *
 * Provides standardized error codes and error handling patterns.
 */

import { HttpsError } from 'firebase-functions/v2/https';

/**
 * Standard error codes for Cloud Functions
 */
export enum ErrorCode {
  // Request errors
  INVALID_ARGUMENT = 'invalid-argument',
  UNAUTHENTICATED = 'unauthenticated',
  PERMISSION_DENIED = 'permission-denied',
  NOT_FOUND = 'not-found',
  ALREADY_EXISTS = 'already-exists',

  // Operational errors
  FAILED_PRECONDITION = 'failed-precondition',
  DEADLINE_EXCEEDED = 'deadline-exceeded',
  RESOURCE_EXHAUSTED = 'resource-exhausted',

  // Service errors
  UNAVAILABLE = 'unavailable',
  INTERNAL = 'internal',
}

/**
 * Create a standardized HttpsError
 */
export function createError(
  code: ErrorCode,
  message: string,
  details?: any
): HttpsError {
  return new HttpsError(code, message, details);
}

/**
 * Wrap a function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('Function error:', error);

      // If it's already an HttpsError, rethrow it
      if (error instanceof HttpsError) {
        throw error;
      }

      // Convert other errors to HttpsError
      if (error instanceof Error) {
        throw createError(
          ErrorCode.INTERNAL,
          error.message,
          { originalError: error.stack }
        );
      }

      // Unknown error
      throw createError(
        ErrorCode.INTERNAL,
        'An unexpected error occurred',
        { error }
      );
    }
  }) as T;
}

/**
 * Validate required fields in request data
 */
export function validateRequiredFields(
  data: any,
  requiredFields: string[]
): void {
  const missingFields = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    throw createError(
      ErrorCode.INVALID_ARGUMENT,
      `Missing required fields: ${missingFields.join(', ')}`
    );
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    throw createError(
      ErrorCode.INVALID_ARGUMENT,
      'Invalid email format'
    );
  }
}

/**
 * Validate phone number (E.164 format)
 */
export function validatePhoneNumber(phoneNumber: string): void {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phoneNumber)) {
    throw createError(
      ErrorCode.INVALID_ARGUMENT,
      'Invalid phone number format. Must be in E.164 format (e.g., +1234567890)'
    );
  }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string, minLength: number = 8): void {
  if (!password || password.length < minLength) {
    throw createError(
      ErrorCode.INVALID_ARGUMENT,
      `Password must be at least ${minLength} characters long`
    );
  }
}

/**
 * Check if user is authenticated
 */
export function requireAuth(auth: any): void {
  if (!auth || !auth.uid) {
    throw createError(
      ErrorCode.UNAUTHENTICATED,
      'User must be authenticated to perform this action'
    );
  }
}

/**
 * Check if user is an admin
 */
export function requireAdmin(auth: any): void {
  requireAuth(auth);

  if (!auth.token?.admin) {
    throw createError(
      ErrorCode.PERMISSION_DENIED,
      'User must be an admin to perform this action'
    );
  }
}

/**
 * Validate numeric range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): void {
  if (value < min || value > max) {
    throw createError(
      ErrorCode.INVALID_ARGUMENT,
      `${fieldName} must be between ${min} and ${max}`
    );
  }
}

/**
 * Validate array length
 */
export function validateArrayLength(
  array: any[],
  min: number,
  max: number,
  fieldName: string
): void {
  if (array.length < min || array.length > max) {
    throw createError(
      ErrorCode.INVALID_ARGUMENT,
      `${fieldName} must contain between ${min} and ${max} items`
    );
  }
}

/**
 * Log error with context
 */
export function logError(
  functionName: string,
  error: any,
  context?: Record<string, any>
): void {
  console.error(`[${functionName}] Error:`, {
    message: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Create a not found error
 */
export function notFoundError(resource: string, id: string): HttpsError {
  return createError(
    ErrorCode.NOT_FOUND,
    `${resource} not found: ${id}`
  );
}

/**
 * Create an already exists error
 */
export function alreadyExistsError(resource: string, field: string, value: string): HttpsError {
  return createError(
    ErrorCode.ALREADY_EXISTS,
    `${resource} with ${field} '${value}' already exists`
  );
}

/**
 * Create a rate limit error
 */
export function rateLimitError(limit: number, window: string): HttpsError {
  return createError(
    ErrorCode.RESOURCE_EXHAUSTED,
    `Rate limit exceeded: ${limit} requests per ${window}`
  );
}

/**
 * Create an invalid state error
 */
export function invalidStateError(message: string): HttpsError {
  return createError(
    ErrorCode.FAILED_PRECONDITION,
    message
  );
}
