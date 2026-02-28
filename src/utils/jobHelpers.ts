/**
 * Job helper utilities
 * Common utilities for job handling and management
 */

import type { Job, Queue } from 'bullmq';
import logger from '../logger/index.js';

/**
 * Wait for job completion with timeout
 */
export const waitForJobCompletion = async <T>(
  job: Job,
  timeout: number = 30000,
): Promise<T> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const state = await job.getState();

    if (state === 'completed') {
      return job.returnvalue as T;
    }

    if (state === 'failed') {
      throw new Error(`Job failed: ${job.failedReason}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Job did not complete within ${timeout}ms`);
};

/**
 * Get detailed job information
 */
export const getJobInfo = async (job: Job): Promise<Record<string, any>> => {
  const state = await job.getState();

  return {
    id: job.id,
    name: job.name,
    state,
    data: job.data,
    result: job.returnvalue,
    failedReason: job.failedReason,
    attempts: job.attemptsMade,
    max_attempts: (job.opts as any)?.attempts,
    timestamp: job.timestamp,
  };
};

/**
 * Retry a failed job
 */
export const retryJob = async (
  job: Job,
  queue: Queue,
): Promise<Job | null> => {
  logger.info({ jobId: job.id }, 'Retrying job');

  try {
    await job.remove();

    const newJob = await queue.add(job.name, job.data, {
      ...(job.opts as any),
      jobId: `${job.id}_retry_${Date.now()}`,
    });

    return newJob;
  } catch (error) {
    logger.error({ error }, 'Failed to retry job');
    return null;
  }
};

export default {
  waitForJobCompletion,
  getJobInfo,
  retryJob,
};
