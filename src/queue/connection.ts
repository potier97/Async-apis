import type { ConnectionOptions } from 'bullmq';
import getRedisConfig from '../config/redis.js';

/**
 * Connection for queues (non-blocking operations: add, getJob, getJobCounts)
 */
export function createQueueConnection(): ConnectionOptions {
  return {
    ...getRedisConfig(),
    enableOfflineQueue: false,
  };
}

/**
 * Connection for workers (blocking operations: BRPOPLPUSH)
 * Separate connection avoids deadlocks with queue operations
 */
export function createWorkerConnection(): ConnectionOptions {
  return {
    ...getRedisConfig(),
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
  };
}
