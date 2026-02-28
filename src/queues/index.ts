/**
 * Queue management module
 * Centralized queue creation and management
 */

import { Queue, Worker } from 'bullmq';
import type { Job, WorkerOptions } from 'bullmq';
import config from '../config/index.js';
import logger from '../logger/index.js';
import type { JobProcessor } from '../types/index.js';

const queues = new Map<string, Queue>();
const workers = new Map<string, Worker>();

/**
 * Get or create a queue
 */
export const getQueue = (queueName: string): Queue => {
  if (queues.has(queueName)) {
    return queues.get(queueName)!;
  }

  const queue = new Queue(queueName, {
    connection: config.redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600,
      },
    },
  });

  queue.on('error', (error) => {
    logger.error({ err: error, queue: queueName }, 'Queue error');
  });

  queues.set(queueName, queue);
  logger.info({ queue: queueName }, 'Queue created/loaded');

  return queue;
};

/**
 * Register a worker for a queue
 */
export const registerWorker = <T = any, R = any>(
  queueName: string,
  processor: JobProcessor<T, R>,
  options?: WorkerOptions,
): Worker => {
  if (workers.has(queueName)) {
    logger.warn({ queue: queueName }, 'Worker already registered for queue');
    return workers.get(queueName)!;
  }

  const worker = new Worker<T, R>(queueName, processor, {
    connection: config.redis,
    concurrency: config.concurrency,
    removeOnComplete: {
      age: 3600,
    },
    removeOnFail: {
      age: 86400,
    },
    ...options,
  });

  // Event listeners for observability
  worker.on('completed', (job: Job) => {
    logger.info(
      { jobId: job.id, queueName },
      'Job completed',
    );
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error(
      { jobId: job?.id, queueName, error: err.message },
      'Job failed',
    );
  });

  worker.on('error', (error: Error) => {
    logger.error({ err: error, queue: queueName }, 'Worker error');
  });

  workers.set(queueName, worker);
  logger.info(
    { queue: queueName, concurrency: config.concurrency },
    'Worker registered',
  );

  return worker;
};

/**
 * Get registered worker for a queue
 */
export const getWorker = (queueName: string): Worker | undefined => {
  return workers.get(queueName);
};

/**
 * Close all queues and workers gracefully
 */
export const closeAll = async (): Promise<void> => {
  logger.info('Closing all queues and workers...');

  for (const [name, worker] of workers) {
    try {
      await worker.close();
      logger.info({ queue: name }, 'Worker closed');
    } catch (error) {
      logger.error({ queue: name, err: error }, 'Error closing worker');
    }
  }

  for (const [name, queue] of queues) {
    try {
      await queue.close();
      logger.info({ queue: name }, 'Queue closed');
    } catch (error) {
      logger.error({ queue: name, err: error }, 'Error closing queue');
    }
  }

  workers.clear();
  queues.clear();

  logger.info('All queues and workers closed');
};

export default {
  getQueue,
  registerWorker,
  getWorker,
  closeAll,
};
