/**
 * Error handling utilities for worker tasks
 */

// Error categories for better tracking and handling
export enum ErrorCategory {
  DATABASE = 'database',
  API = 'api',
  ANALYSIS = 'analysis',
  AUTHENTICATION = 'authentication',
  UNKNOWN = 'unknown'
}

// Structure for standardized error information
export interface ErrorInfo {
  category: ErrorCategory;
  message: string;
  originalError?: any;
  context?: Record<string, any>;
}

/**
 * Categorizes an error based on its properties or message
 */
export function categorizeError(error: any): ErrorCategory {
  const errorMessage = error?.message?.toLowerCase() || '';

  if (
    errorMessage.includes('database') ||
    errorMessage.includes('db') ||
    errorMessage.includes('sql') ||
    errorMessage.includes('query') ||
    errorMessage.includes('supabase')
  ) {
    return ErrorCategory.DATABASE;
  }

  if (
    errorMessage.includes('api') ||
    errorMessage.includes('http') ||
    errorMessage.includes('request') ||
    errorMessage.includes('spotify')
  ) {
    return ErrorCategory.API;
  }

  if (
    errorMessage.includes('analysis') ||
    errorMessage.includes('analyze') ||
    errorMessage.includes('openai') ||
    errorMessage.includes('anthropic') ||
    errorMessage.includes('llm')
  ) {
    return ErrorCategory.ANALYSIS;
  }

  if (
    errorMessage.includes('auth') ||
    errorMessage.includes('token') ||
    errorMessage.includes('permission') ||
    errorMessage.includes('access')
  ) {
    return ErrorCategory.AUTHENTICATION;
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Creates a standardized error info object
 */
export function createErrorInfo(error: any, context?: Record<string, any>): ErrorInfo {
  return {
    category: categorizeError(error),
    message: error?.message || 'Unknown error occurred',
    originalError: error,
    context
  };
}

/**
 * Logs error information in a structured way
 */
export function logError(logger: any, errorInfo: ErrorInfo): void {
  logger.error({
    msg: `Error [${errorInfo.category}]: ${errorInfo.message}`,
    category: errorInfo.category,
    context: errorInfo.context,
    error: errorInfo.originalError
  });
}
