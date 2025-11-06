/**
 * Authentication Error Handling Utilities
 *
 * Provides user-friendly error messages for verification failures,
 * expired codes, rate limits, and other auth-related errors.
 */

export interface AuthError {
  code: string;
  message: string;
  userMessage: string;
  recoveryAction?: 'retry' | 'wait' | 'contact_support' | 'resend_code';
  waitTime?: number; // in milliseconds
}

/**
 * Parse Firebase Auth error and return user-friendly message
 */
export function parseFirebaseAuthError(error: any): AuthError {
  const code = error.code || 'unknown';
  const message = error.message || 'Unknown error occurred';

  const errorMap: Record<string, Omit<AuthError, 'code' | 'message'>> = {
    // Email/Password errors
    'auth/email-already-in-use': {
      userMessage: 'This email is already registered. Please login instead.',
      recoveryAction: 'retry',
    },
    'auth/invalid-email': {
      userMessage: 'Invalid email address format.',
      recoveryAction: 'retry',
    },
    'auth/weak-password': {
      userMessage: 'Password is too weak. Use at least 8 characters.',
      recoveryAction: 'retry',
    },
    'auth/user-not-found': {
      userMessage: 'No account found with this email.',
      recoveryAction: 'retry',
    },
    'auth/wrong-password': {
      userMessage: 'Incorrect password.',
      recoveryAction: 'retry',
    },
    'auth/invalid-credential': {
      userMessage: 'Invalid email or password.',
      recoveryAction: 'retry',
    },
    'auth/user-disabled': {
      userMessage: 'This account has been disabled. Please contact support.',
      recoveryAction: 'contact_support',
    },
    'auth/too-many-requests': {
      userMessage: 'Too many failed attempts. Please wait before trying again.',
      recoveryAction: 'wait',
      waitTime: 60 * 60 * 1000, // 1 hour
    },
    'auth/network-request-failed': {
      userMessage: 'Network error. Please check your connection and try again.',
      recoveryAction: 'retry',
    },
  };

  const errorInfo = errorMap[code] || {
    userMessage: 'An error occurred. Please try again.',
    recoveryAction: 'retry' as const,
  };

  return {
    code,
    message,
    ...errorInfo,
  };
}

/**
 * Parse Cloud Function error and return user-friendly message
 */
export function parseCloudFunctionError(error: any): AuthError {
  const code = error.code || 'unknown';
  const message = error.message || 'Unknown error occurred';

  const errorMap: Record<string, Omit<AuthError, 'code' | 'message'>> = {
    // Verification code errors
    'functions/invalid-argument': {
      userMessage: 'Invalid input. Please check your information and try again.',
      recoveryAction: 'retry',
    },
    'functions/failed-precondition': {
      userMessage: 'Too many attempts. Please wait 1 hour before trying again.',
      recoveryAction: 'wait',
      waitTime: 60 * 60 * 1000, // 1 hour
    },
    'functions/not-found': {
      userMessage: 'No verification found. Please request a new code.',
      recoveryAction: 'resend_code',
    },
    'functions/deadline-exceeded': {
      userMessage: 'Verification code has expired. Please request a new code.',
      recoveryAction: 'resend_code',
    },
    'functions/permission-denied': {
      userMessage: 'Invalid verification code. Please check and try again.',
      recoveryAction: 'retry',
    },
    'functions/unavailable': {
      userMessage: 'Service temporarily unavailable. Please try again later.',
      recoveryAction: 'wait',
      waitTime: 5 * 60 * 1000, // 5 minutes
    },
    'functions/internal': {
      userMessage: 'An unexpected error occurred. Please try again.',
      recoveryAction: 'retry',
    },
  };

  const errorInfo = errorMap[code] || {
    userMessage: 'An error occurred. Please try again.',
    recoveryAction: 'retry' as const,
  };

  return {
    code,
    message,
    ...errorInfo,
  };
}

/**
 * Get user-friendly error message for any auth-related error
 */
export function getAuthErrorMessage(error: any): string {
  if (error.code?.startsWith('auth/')) {
    return parseFirebaseAuthError(error).userMessage;
  } else if (error.code?.startsWith('functions/')) {
    return parseCloudFunctionError(error).userMessage;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: any): boolean {
  return (
    error.code === 'auth/too-many-requests' ||
    error.code === 'functions/failed-precondition'
  );
}

/**
 * Check if error is an expired code error
 */
export function isExpiredCodeError(error: any): boolean {
  return error.code === 'functions/deadline-exceeded';
}

/**
 * Check if error is an invalid code error
 */
export function isInvalidCodeError(error: any): boolean {
  return error.code === 'functions/permission-denied';
}

/**
 * Get wait time from rate limit error (in milliseconds)
 */
export function getRateLimitWaitTime(error: any): number {
  if (error.code === 'auth/too-many-requests') {
    return 60 * 60 * 1000; // 1 hour
  } else if (error.code === 'functions/failed-precondition') {
    return 60 * 60 * 1000; // 1 hour
  }

  return 0;
}

/**
 * Format wait time to human-readable string
 */
export function formatWaitTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`
      : `${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
  }
}

/**
 * Get recovery action suggestion for error
 */
export function getRecoveryAction(error: any): string {
  const authError = error.code?.startsWith('auth/')
    ? parseFirebaseAuthError(error)
    : parseCloudFunctionError(error);

  switch (authError.recoveryAction) {
    case 'retry':
      return 'Please try again.';
    case 'wait':
      if (authError.waitTime) {
        return `Please wait ${formatWaitTime(authError.waitTime)} before trying again.`;
      }
      return 'Please wait a moment before trying again.';
    case 'resend_code':
      return 'Please request a new verification code.';
    case 'contact_support':
      return 'Please contact support for assistance.';
    default:
      return 'Please try again or contact support if the problem persists.';
  }
}

/**
 * Create formatted error object with all details
 */
export function createAuthErrorDetails(error: any): {
  title: string;
  message: string;
  action: string;
  canRetry: boolean;
  shouldWait: boolean;
  waitTime?: number;
} {
  const authError = error.code?.startsWith('auth/')
    ? parseFirebaseAuthError(error)
    : parseCloudFunctionError(error);

  return {
    title: getTitleForError(authError),
    message: authError.userMessage,
    action: getRecoveryAction(error),
    canRetry: authError.recoveryAction === 'retry',
    shouldWait: authError.recoveryAction === 'wait',
    waitTime: authError.waitTime,
  };
}

/**
 * Get appropriate title for error
 */
function getTitleForError(authError: AuthError): string {
  if (authError.code.includes('rate-limit') || authError.code.includes('too-many')) {
    return 'Too Many Attempts';
  } else if (authError.code.includes('expired') || authError.code === 'functions/deadline-exceeded') {
    return 'Code Expired';
  } else if (authError.code.includes('invalid') || authError.code === 'functions/permission-denied') {
    return 'Invalid Code';
  } else if (authError.code.includes('not-found')) {
    return 'Not Found';
  } else if (authError.code.includes('network')) {
    return 'Network Error';
  }

  return 'Error';
}

/**
 * Log error for debugging (in development only)
 */
export function logAuthError(error: any, context: string): void {
  if (__DEV__) {
    console.error(`[Auth Error - ${context}]`, {
      code: error.code,
      message: error.message,
      details: error,
    });
  }
}
