import { createLogger } from './logger';

export * from './types';
export { createLogger } from './logger';

/**
 * Default logger instance for easy use across the application.
 * @example
 * import { logger } from '@/utils/logger';
 * logger.info('User logged in', { userId: '123' });
 */
export const logger = createLogger();
