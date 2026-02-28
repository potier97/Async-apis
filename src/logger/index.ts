/**
 * Logger configuration
 * Sets up Pino logger with appropriate levels and transports
 */

import pino from 'pino';
import config from '../config/index.js';

const createLogger = () => {
  const isDevelopment = config.isDevelopment;

  if (isDevelopment) {
    const transport = pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    });

    const logger = pino(
      {
        level: config.logLevel || 'info',
        timestamp: pino.stdTimeFunctions.isoTime,
      },
      transport,
    );

    return logger;
  }

  const logger = pino({
    level: config.logLevel || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
  });

  return logger;
};

export const logger = createLogger();

export default logger;
