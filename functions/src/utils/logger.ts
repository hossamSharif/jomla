/**
 * Comprehensive Error Logging Utility
 *
 * Provides structured logging to Cloud Logging with error tracking,
 * context information, and severity levels.
 */

import { logger as functionsLogger } from 'firebase-functions/v2';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  functionName?: string;
  [key: string]: any;
}

export interface ErrorDetails {
  message: string;
  stack?: string;
  code?: string;
  statusCode?: number;
  context?: LogContext;
}

/**
 * Structured logger class
 */
export class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Set context for subsequent logs
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Log debug information
   */
  debug(message: string, data?: any): void {
    functionsLogger.debug(message, {
      ...this.context,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log informational messages
   */
  info(message: string, data?: any): void {
    functionsLogger.info(message, {
      ...this.context,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log warnings
   */
  warn(message: string, data?: any): void {
    functionsLogger.warn(message, {
      ...this.context,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log errors with full context
   */
  error(message: string, error?: Error | any, additionalData?: any): void {
    const errorDetails: ErrorDetails = {
      message,
      context: this.context,
    };

    if (error instanceof Error) {
      errorDetails.message = error.message;
      errorDetails.stack = error.stack;
      errorDetails.code = (error as any).code;
    } else if (error) {
      errorDetails.message = String(error);
    }

    functionsLogger.error(message, {
      error: errorDetails,
      ...additionalData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log HTTP request
   */
  logRequest(req: {
    method?: string;
    path?: string;
    headers?: any;
    body?: any;
    query?: any;
  }): void {
    this.info('HTTP Request', {
      method: req.method,
      path: req.path,
      headers: this.sanitizeHeaders(req.headers),
      query: req.query,
      bodySize: req.body ? JSON.stringify(req.body).length : 0,
    });
  }

  /**
   * Log HTTP response
   */
  logResponse(res: {
    statusCode?: number;
    body?: any;
    duration?: number;
  }): void {
    this.info('HTTP Response', {
      statusCode: res.statusCode,
      bodySize: res.body ? JSON.stringify(res.body).length : 0,
      duration: res.duration,
    });
  }

  /**
   * Log function execution
   */
  logFunctionExecution(functionName: string, startTime: number, success: boolean, error?: Error): void {
    const duration = Date.now() - startTime;

    if (success) {
      this.info(`Function ${functionName} completed successfully`, {
        functionName,
        duration,
        success: true,
      });
    } else {
      this.error(`Function ${functionName} failed`, error, {
        functionName,
        duration,
        success: false,
      });
    }
  }

  /**
   * Log database operation
   */
  logDatabaseOp(operation: string, collection: string, docId?: string, duration?: number): void {
    this.debug('Database Operation', {
      operation,
      collection,
      docId,
      duration,
    });
  }

  /**
   * Log external API call
   */
  logExternalApiCall(service: string, endpoint: string, duration: number, success: boolean): void {
    this.info('External API Call', {
      service,
      endpoint,
      duration,
      success,
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: string, userId?: string, details?: any): void {
    this.warn('Security Event', {
      event,
      userId,
      ...details,
      severity: 'security',
    });
  }

  /**
   * Sanitize sensitive headers
   */
  private sanitizeHeaders(headers: any): any {
    if (!headers) return {};

    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized = { ...headers };

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}

/**
 * Create logger instance with context
 */
export function createLogger(context?: LogContext): Logger {
  return new Logger(context);
}

/**
 * Performance tracking decorator
 */
export function withPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  functionName: string
): T {
  return (async (...args: any[]) => {
    const logger = createLogger({ functionName });
    const startTime = Date.now();

    try {
      const result = await fn(...args);
      logger.logFunctionExecution(functionName, startTime, true);
      return result;
    } catch (error) {
      logger.logFunctionExecution(functionName, startTime, false, error as Error);
      throw error;
    }
  }) as T;
}

/**
 * Error tracking and reporting
 */
export class ErrorTracker {
  private static instance: ErrorTracker;
  private logger: Logger;

  private constructor() {
    this.logger = createLogger({ service: 'ErrorTracker' });
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  /**
   * Track error with categorization
   */
  trackError(error: Error, category: string, context?: LogContext): void {
    this.logger.error(`[${category}] ${error.message}`, error, {
      category,
      ...context,
    });
  }

  /**
   * Track validation error
   */
  trackValidationError(field: string, message: string, value?: any): void {
    this.logger.warn('Validation Error', {
      category: 'validation',
      field,
      message,
      value: value ? this.sanitizeValue(value) : undefined,
    });
  }

  /**
   * Track authentication error
   */
  trackAuthError(userId: string, reason: string): void {
    this.logger.logSecurityEvent('Authentication Failed', userId, {
      reason,
    });
  }

  /**
   * Track authorization error
   */
  trackAuthorizationError(userId: string, resource: string, action: string): void {
    this.logger.logSecurityEvent('Authorization Failed', userId, {
      resource,
      action,
    });
  }

  /**
   * Sanitize sensitive values
   */
  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // Mask email addresses
      if (value.includes('@')) {
        const [local, domain] = value.split('@');
        return `${local.substring(0, 2)}***@${domain}`;
      }
      // Mask phone numbers
      if (/^\+?\d{10,}$/.test(value)) {
        return `***${value.slice(-4)}`;
      }
    }
    return value;
  }
}

/**
 * Global error handler for unhandled errors
 */
export function setupGlobalErrorHandler(): void {
  process.on('unhandledRejection', (reason, promise) => {
    const logger = createLogger({ service: 'GlobalErrorHandler' });
    logger.error('Unhandled Promise Rejection', reason as Error, {
      promise: promise.toString(),
    });
  });

  process.on('uncaughtException', (error) => {
    const logger = createLogger({ service: 'GlobalErrorHandler' });
    logger.error('Uncaught Exception', error);
    // Exit process to allow restart
    process.exit(1);
  });
}
