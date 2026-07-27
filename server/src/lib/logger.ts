import pino from 'pino';
import { env, isDevelopment } from '../config/env.js';

/**
 * Shared application logger (pino).
 * Used for upload / AI / database lifecycle events and error tracking.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});
