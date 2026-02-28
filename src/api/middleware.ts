/**
 * Express middleware
 * Middleware for logging, error handling, and request processing
 */

import type { Request, Response, NextFunction } from 'express';
import logger from '../logger/index.js';

/**
 * Request logging middleware
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(
      {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
      },
      'HTTP Request',
    );
  });

  next();
};

/**
 * Error handling middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error(
    {
      error: err.message,
      stack: err.stack,
      method: req.method,
      path: req.path,
    },
    'Unhandled error',
  );

  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
};

export default {
  requestLogger,
  errorHandler,
};
