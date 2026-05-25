import { Transport, LogEntry, LoggerConfig, LogLevelString } from '../types';

export const consoleTransport: Transport = {
  name: 'console',
  send: (entry: LogEntry, config?: LoggerConfig) => {
    const { message, context, data, error } = entry;
    const level = context.level as LogLevelString;
    const prettyPrint = config?.prettyPrint ?? true;

    if (prettyPrint) {
      const emoji: Record<LogLevelString, string> = {
        debug: '🐛',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        fatal: '💀',
      };

      const consoleMethod = level === 'fatal' ? 'error' : level;
      const levelEmoji = emoji[level] || '📝';

      const args: unknown[] = [
        `%c${levelEmoji} [${level?.toUpperCase() || 'LOG'}]%c ${message}`,
        `color: ${level === 'error' || level === 'fatal' ? 'red' : level === 'warn' ? 'orange' : 'blue'}; font-weight: bold;`,
        'color: inherit;',
      ];

      // Add context if there's useful info
      const contextInfo = { ...context };
      delete contextInfo.timestamp;
      delete contextInfo.level;
      delete contextInfo.environment;

      if (Object.keys(contextInfo).length > 0 || data || error) {
        args.push({ context: contextInfo, data, error });
      }

      const logMethod = console[consoleMethod] ?? console.log;
      logMethod(...args);
      return;
    }

    // Plain JSON output
    const consoleMethod = level === 'fatal' ? 'error' : level;
    const logMethod = console[consoleMethod] ?? console.log;
    logMethod(JSON.stringify(entry));
  },
};
