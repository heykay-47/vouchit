import { LogLevel, LogLevelString, Logger, LogContext, LoggerConfig, LogEntry } from './types';
import { getConfig, mergeConfig } from './config';
import { serializeError, sanitizeData } from './serialization';

const LogLevelMap: Record<LogLevelString, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
  fatal: LogLevel.FATAL,
};

export const createLogger = (customConfig?: LoggerConfig): Logger => {
  const config = mergeConfig(getConfig(), customConfig);
  let globalContext: Partial<LogContext> = config.context || {};

  const log = (level: LogLevelString, message: string, errorOrData?: Error | unknown, data?: Record<string, any>) => {
    if (!config.enabled) return;

    const currentLevel = LogLevelMap[level];
    const minLevel = LogLevelMap[config.minLevel!];
    if (currentLevel < minLevel) return;

    let error: Error | unknown | undefined = errorOrData;
    let logData: Record<string, any> | undefined = data;

    if (!(errorOrData instanceof Error) && typeof errorOrData === 'object' && errorOrData !== null) {
      logData = { ...errorOrData, ...data };
      error = undefined;
    } else if (data) {
      logData = data;
      error = errorOrData;
    } else if (errorOrData) {
        if(errorOrData instanceof Error) {
            error = errorOrData
        } else {
            logData = errorOrData as Record<string, any>
            error = undefined
        }
    }

    const entry: LogEntry = {
      message,
      context: {
        ...globalContext,
        timestamp: new Date().toISOString(),
        level,
        environment: import.meta.env.MODE === 'production' || import.meta.env.MODE === 'test' ? import.meta.env.MODE : 'development',
      },
      data: config.sanitize ? sanitizeData(logData || {}) : logData,
      error: error ? serializeError(error) : undefined,
    };

    config.transports?.forEach(transport => {
      try {
        const transportMinLevel = transport.minLevel ? LogLevelMap[transport.minLevel] : minLevel;
        if (currentLevel >= transportMinLevel) {
          transport.send(entry, config);
        }
      } catch (e) {
        console.error('Error in logger transport:', e);
      }
    });
  };

  return {
    debug: (message, data) => log('debug', message, data),
    info: (message, data) => log('info', message, data),
    warn: (message, data) => log('warn', message, data),
    error: (message, error, data) => log('error', message, error, data),
    fatal: (message, error, data) => log('fatal', message, error, data),
    setContext: (context) => {
      globalContext = { ...globalContext, ...context };
    },
    clearContext: () => {
      globalContext = {};
    },
    setLevel: (level) => {
      config.minLevel = level;
    },
    enable: () => {
      config.enabled = true;
    },
    disable: () => {
      config.enabled = false;
    },
  };
};
