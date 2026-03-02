/**
 * Logger configuration
 * Sets up Pino logger with appropriate levels and transports
 */

import pino, { type Logger } from 'pino';
import config from '../config/index.js';

const createLogger = (): Logger => {
  const loggerOptions: pino.LoggerOptions = {
    level: config.logLevel || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  if (config.isDevelopment) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- pino.transport() returns ThreadStream typed as `any` in @types/pino
    const transport = pino.transport<Record<string, boolean | string>>({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    });

    return pino(loggerOptions, transport);
  }

  return pino(loggerOptions);
};

export const logger = createLogger();

export default logger;
