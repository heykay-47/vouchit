import { LoggerConfig } from './types';
import { consoleTransport } from './transports';

const environment = import.meta.env.MODE || 'production';

const devConfig: LoggerConfig = {
  minLevel: 'debug',
  enabled: true,
  prettyPrint: true,
  includeStackTrace: true,
  sanitize: false,
  transports: [consoleTransport],
};

const prodConfig: LoggerConfig = {
  minLevel: 'warn',
  enabled: true,
  prettyPrint: false,
  includeStackTrace: true,
  sanitize: true,
  maxDataSize: 1000,
  transports: [consoleTransport],
};

const testConfig: LoggerConfig = {
  minLevel: 'error',
  enabled: false,
  prettyPrint: false,
  transports: [], // Mock transport will be added in tests
};

const configMap = {
  development: devConfig,
  production: prodConfig,
  test: testConfig,
};

export const getConfig = (): LoggerConfig => {
  const baseConfig = configMap[environment] || prodConfig;
  
  // Allow overrides from environment variables
  return {
    ...baseConfig,
    minLevel: import.meta.env.VITE_LOG_LEVEL || baseConfig.minLevel,
    enabled: import.meta.env.VITE_LOG_ENABLED !== 'false' && baseConfig.enabled,
    prettyPrint: import.meta.env.VITE_LOG_PRETTY === 'true' || baseConfig.prettyPrint,
  };
};

export const mergeConfig = (base: LoggerConfig, custom?: LoggerConfig): LoggerConfig => {
  if (!custom) return base;
  return {
    ...base,
    ...custom,
    context: { ...base.context, ...custom.context },
    transports: custom.transports || base.transports,
  };
};
