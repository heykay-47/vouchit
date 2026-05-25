/**
 * Log levels in ascending severity order
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

/**
 * String representation for easier config
 */
export type LogLevelString = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Context attached to every log entry
 * Automatically injected: timestamp, level, environment
 * User-provided: userId, component, page, action, etc.
 */
export interface LogContext {
  // Auto-injected fields
  timestamp: string;        // ISO 8601 format
  level: LogLevelString;
  environment: 'development' | 'production' | 'test';
  
  // User-provided fields (optional)
  userId?: string;
  sessionId?: string;
  component?: string;
  page?: string;
  action?: string;
  [key: string]: any;       // Allow custom fields
}

/**
 * Structured log entry
 */
export interface LogEntry {
  message: string;
  context: LogContext;
  data?: Record<string, any>;  // Structured data
  error?: SerializedError;     // Error object (if applicable)
}

/**
 * Serialized error (safe for JSON)
 */
export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  cause?: any;
  code?: string;           // Error code (if available)
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  // Minimum level to log (logs below this are ignored)
  minLevel?: LogLevelString;
  
  // Enable/disable logging globally
  enabled?: boolean;
  
  // Default context to merge into every log
  context?: Partial<LogContext>;
  
  // Transports (where to send logs)
  transports?: Transport[];
  
  // Development options
  prettyPrint?: boolean;     // Pretty console output in dev
  includeStackTrace?: boolean; // Include stack traces for errors
  
  // Production options
  sanitize?: boolean;        // Remove sensitive data
  maxDataSize?: number;      // Max size of data object (prevent huge logs)
}

/**
 * Transport interface (where logs are sent)
 */
export interface Transport {
  name: string;
  minLevel?: LogLevelString;
  send: (entry: LogEntry, config?: LoggerConfig) => void | Promise<void>;
}

/**
 * Logger instance interface
 */
export interface Logger {
  debug(message: string, data?: Record<string, any>): void;
  info(message: string, data?: Record<string, any>): void;
  warn(message: string, data?: Record<string, any>): void;
  error(message: string, error?: Error | unknown, data?: Record<string, any>): void;
  fatal(message: string, error?: Error | unknown, data?: Record<string, any>): void;
  
  // Context management
  setContext(context: Partial<LogContext>): void;
  clearContext(): void;
  
  // Configuration
  setLevel(level: LogLevelString): void;
  enable(): void;
  disable(): void;
}
