import { SerializedError } from './types';

/**
 * Safely serialize error objects
 * Handles: Error, ErrorEvent, DOMException, custom errors
 */
export function serializeError(error: unknown): SerializedError {
  if (!error) {
    return { name: 'UnknownError', message: 'No error provided' };
  }
  
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: 'cause' in error && error.cause ? serializeError(error.cause) : undefined,
      code: 'code' in error ? error.code : undefined,
    };
  }
  
  if (typeof error === 'object') {
    return {
      name: 'CustomError',
      message: JSON.stringify(error),
    };
  }
  
  return {
    name: 'UnknownError',
    message: String(error),
  };
}

/**
 * Remove sensitive data from logs
 */
export function sanitizeData<T extends Record<string, unknown>>(data: T): T {
  if (!data) return data;

  const sensitiveKeys = [
    'password', 'token', 'apiKey', 'secret', 'authorization', 'cookie', 'sessionId'
  ];
  
  const sanitized: Record<string, unknown> = { ...data };
  
  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key] as Record<string, unknown>);
    }
  }
  
  return sanitized as T;
}
