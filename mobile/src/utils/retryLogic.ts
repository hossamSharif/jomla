/**
 * Retry Logic Utility for Cloud Function Calls
 *
 * Provides exponential backoff retry mechanism for failed HTTP requests
 * to Cloud Functions with configurable retry attempts and delays.
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableStatusCodes?: number[];
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: any, retryableStatusCodes: number[]): boolean {
  // Network errors
  if (error.message?.includes('network') || error.message?.includes('timeout')) {
    return true;
  }

  // Firebase errors
  if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
    return true;
  }

  // HTTP status codes
  if (error.status && retryableStatusCodes.includes(error.status)) {
    return true;
  }

  // Fetch errors
  if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
    return true;
  }

  return false;
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number
): number {
  const delay = initialDelay * Math.pow(backoffMultiplier, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 *
 * @example
 * ```ts
 * const result = await retryWithBackoff(
 *   () => fetchUserData(userId),
 *   {
 *     maxRetries: 3,
 *     onRetry: (attempt, error) => {
 *       console.log(`Retry attempt ${attempt}:`, error.message);
 *     }
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if this is the last attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error, opts.retryableStatusCodes)) {
        throw error;
      }

      // Calculate delay for next retry
      const delay = calculateDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      );

      // Call onRetry callback if provided
      if (options.onRetry) {
        options.onRetry(attempt + 1, error);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Wrapper for fetch requests with retry logic
 *
 * @example
 * ```ts
 * const response = await fetchWithRetry(
 *   'https://us-central1-project.cloudfunctions.net/myFunction',
 *   {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ data: 'value' })
 *   },
 *   { maxRetries: 3 }
 * );
 * ```
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  return retryWithBackoff(async () => {
    const response = await fetch(url, init);

    // Throw error for non-OK responses
    if (!response.ok) {
      const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      error.response = response;
      throw error;
    }

    return response;
  }, retryOptions);
}

/**
 * Wrapper for Cloud Functions HTTP callable requests with retry
 *
 * @example
 * ```ts
 * import { getFunctions, httpsCallable } from 'firebase/functions';
 *
 * const functions = getFunctions();
 * const myFunction = httpsCallable(functions, 'myFunction');
 *
 * const result = await callFunctionWithRetry(myFunction, { userId: '123' });
 * ```
 */
export async function callFunctionWithRetry<T = any, R = any>(
  callable: (data: T) => Promise<{ data: R }>,
  data: T,
  retryOptions?: RetryOptions
): Promise<R> {
  return retryWithBackoff(async () => {
    const result = await callable(data);
    return result.data;
  }, retryOptions);
}

/**
 * Circuit breaker pattern for repeated failures
 * Prevents overwhelming a failing service with requests
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.timeout) {
        // Try half-open state
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();

      // Success - reset circuit
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.threshold) {
        this.state = 'open';
      }

      throw error;
    }
  }

  reset(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }
}
