/**
 * Idempotency service
 * Ensures requests with the same key are processed only once
 */

import logger from '../logger/index.js';
import type { IdempotencyRecord } from '../types/index.js';

/**
 * In-memory idempotency cache
 * In production, this should be Redis or a database
 */
const idempotencyCache = new Map<string, IdempotencyRecord>();

/**
 * TTL for idempotency records (24 hours)
 */
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Check if an idempotent operation was already performed
 */
export function checkIdempotency(idempotencyKey: string): IdempotencyRecord | null {
  if (!idempotencyKey) {
    return null;
  }

  const record = idempotencyCache.get(idempotencyKey);

  if (!record) {
    return null;
  }

  // Check if record expired
  if (Date.now() > record.expiresAt.getTime()) {
    idempotencyCache.delete(idempotencyKey);
    logger.info(
      { idempotencyKey },
      'Idempotency record expired, removed from cache',
    );
    return null;
  }

  logger.info(
    { idempotencyKey, jobId: record.jobId },
    'Idempotent operation already performed, returning cached result',
  );

  return record;
}

/**
 * Store an idempotency record
 */
export function storeIdempotency(
  idempotencyKey: string,
  jobId: string,
  jobType: string,
  result: any,
): void {
  if (!idempotencyKey) {
    return;
  }

  const record: IdempotencyRecord = {
    idempotencyKey,
    jobId,
    jobType,
    result,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
  };

  idempotencyCache.set(idempotencyKey, record);

  logger.debug(
    { idempotencyKey, jobId, expiresIn: IDEMPOTENCY_TTL_MS },
    'Idempotency record stored',
  );
}

/**
 * Clear all idempotency records (for testing/cleanup)
 */
export function clearIdempotencyCache(): void {
  idempotencyCache.clear();
  logger.info('Idempotency cache cleared');
}

/**
 * Get cache statistics
 */
export function getIdempotencyCacheStats() {
  return {
    size: idempotencyCache.size,
    ttlMs: IDEMPOTENCY_TTL_MS,
  };
}
