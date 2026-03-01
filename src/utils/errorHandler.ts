/**
 * Error handler for granular job error management
 * Provides specialized handling for different error types
 */

import type { Job } from 'bullmq';
import logger from '../logger/index.js';

/**
 * Error types for specialized handling
 */
export enum ErrorType {
  PERMANENT = 'PERMANENT', // Don't retry (invalid data, user deleted, etc)
  TEMPORARY = 'TEMPORARY', // Retry with normal backoff (network error, server busy)
  RATE_LIMITED = 'RATE_LIMITED', // Retry with longer delay (API rate limit)
  CONFIGURATION = 'CONFIGURATION' // Don't retry (bad config, missing API key)
}

/**
 * Custom error class with type information
 */
export class JobError extends Error {
  constructor(
    message: string,
    public type: ErrorType = ErrorType.TEMPORARY,
    public retryAfterSeconds?: number
  ) {
    super(message);
    this.name = 'JobError';
  }
}

/**
 * Handle job errors with appropriate retry strategy
 */
export async function handleJobError<T>(
  job: Job<T>,
  error: Error
): Promise<never> {
  const jobError =
    error instanceof JobError ? error : new JobError(error.message);

  const context = {
    jobId: job.id,
    attempt: job.attemptsMade + 1,
    totalAttempts: job.opts?.attempts || 3,
    errorType: jobError.type,
    errorMessage: jobError.message
  };

  switch (jobError.type) {
  case ErrorType.PERMANENT: {
    logger.error(context, 'Permanent error - job will not be retried');
    throw job.discard();
  }

  case ErrorType.RATE_LIMITED: {
    const delayMs = (jobError.retryAfterSeconds || 60) * 1000;
    logger.warn(
      { ...context, retryAfterMs: delayMs },
      'Rate limited - will retry with custom delay'
    );
    throw job.moveToDelayed(Date.now() + delayMs, 'rate-limit');
  }

  case ErrorType.CONFIGURATION: {
    logger.error(context, 'Configuration error - job will not be retried');
    throw job.discard();
  }

  case ErrorType.TEMPORARY:
  default: {
    logger.warn(
      context,
      'Temporary error - will retry with exponential backoff'
    );
    throw error;
  }
  }
}

/**
 * Classify error type based on error message or properties
 */
export function classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase();

  // Rate limit errors
  if (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('429')
  ) {
    return ErrorType.RATE_LIMITED;
  }

  // Permanent/validation errors
  if (
    message.includes('invalid') ||
    message.includes('not found') ||
    message.includes('deleted') ||
    message.includes('bad request')
  ) {
    return ErrorType.PERMANENT;
  }

  // Configuration errors
  if (
    message.includes('api key') ||
    message.includes('configuration') ||
    message.includes('not configured')
  ) {
    return ErrorType.CONFIGURATION;
  }

  // Default to temporary (network, timeout, etc)
  return ErrorType.TEMPORARY;
}

/**
 * Create a JobError with automatic classification
 */
export function createJobError(
  message: string,
  overrideType?: ErrorType
): JobError {
  const type = overrideType || classifyError(new Error(message));
  return new JobError(message, type);
}
