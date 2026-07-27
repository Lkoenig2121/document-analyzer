import { env } from './env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (env.isProduction && level === 'debug') {
    return;
  }

  const payload = context ? `${message} ${JSON.stringify(context)}` : message;

  switch (level) {
    case 'debug':
      console.debug(`[client] ${payload}`);
      break;
    case 'info':
      console.info(`[client] ${payload}`);
      break;
    case 'warn':
      console.warn(`[client] ${payload}`);
      break;
    case 'error':
      console.error(`[client] ${payload}`);
      break;
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => log('error', message, context),
};
