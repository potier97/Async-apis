import { UnrecoverableError } from 'bullmq';

export class NonRetryableError extends Error {
  readonly originalError?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'NonRetryableError';
    this.originalError = cause;
  }
}

export class RetryableError extends Error {
  readonly originalError?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'RetryableError';
    this.originalError = cause;
  }
}

export function classifyError(error: unknown): 'retry' | 'fatal' {
  if (error instanceof NonRetryableError) {
    return 'fatal';
  }

  if (error instanceof RetryableError) {
    return 'retry';
  }

  // HTTP-like errors: 4xx = fatal, 5xx = retry
  if (error instanceof Error && 'status' in error) {
    const status = (error as Error & { status: number }).status;
    if (status >= 400 && status < 500) {
      return 'fatal';
    }
  }

  // Default: retry (let BullMQ handle backoff)
  return 'retry';
}

/**
 * Converts our error classes to BullMQ-native errors.
 * - NonRetryableError → UnrecoverableError (BullMQ won't retry)
 * - RetryableError → regular Error (BullMQ will retry with backoff)
 * - Unknown errors → classified automatically
 */
export function wrapJobError(error: unknown): Error {
  if (error instanceof NonRetryableError) {
    return new UnrecoverableError(error.message);
  }

  if (error instanceof RetryableError) {
    return error;
  }

  const classification = classifyError(error);

  if (classification === 'fatal') {
    const msg = error instanceof Error ? error.message : String(error);
    return new UnrecoverableError(msg);
  }

  return error instanceof Error ? error : new Error(String(error));
}
