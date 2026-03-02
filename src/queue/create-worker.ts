import { Worker } from 'bullmq';
import type { Queue } from './define-queue.js';
import { getHandler } from './handler.js';
import { wrapJobError } from './errors.js';
import { createWorkerConnection } from './connection.js';
import logger from '../logger/index.js';

interface WorkerOptions {
  concurrency?: number;
}

export function createWorker<TName extends string>(
  queue: Queue<TName>,
  options?: WorkerOptions,
): Worker {
  const worker = new Worker(
    queue.name,
    async (job) => {
      try {
        const handler = getHandler(job.name);
        const validatedData = handler.schema.parse(job.data);
        Object.assign(job.data, validatedData);
        return await handler.execute(job);
      } catch (error) {
        throw wrapJobError(error);
      }
    },
    {
      connection: createWorkerConnection(),
      concurrency: options?.concurrency ?? 5,
      stalledInterval: 30000,
      maxStalledCount: 2,
      lockDuration: 60000,
      lockRenewTime: 30000,
    },
  );

  // --- Event listeners for observability ---

  worker.on('ready', () => {
    logger.info({ queue: worker.name }, 'Worker ready');
  });

  worker.on('active', (job) => {
    logger.debug(
      {
        jobId: job.id,
        jobName: job.name,
        queue: worker.name,
        attempt: job.attemptsMade + 1,
      },
      'Job started',
    );
  });

  worker.on('progress', (job, progress) => {
    logger.debug(
      { jobId: job.id, jobName: job.name, queue: worker.name, progress },
      'Job progress',
    );
  });

  worker.on('completed', (job) => {
    logger.info(
      {
        jobId: job.id,
        jobName: job.name,
        queue: worker.name,
        attemptsMade: job.attemptsMade,
      },
      'Job completed',
    );
  });

  worker.on('failed', (job, error) => {
    const isFinalAttempt = job
      ? job.attemptsMade >= (job.opts.attempts ?? 1)
      : true;

    logger.error(
      {
        jobId: job?.id,
        jobName: job?.name,
        queue: worker.name,
        attemptsMade: job?.attemptsMade,
        maxAttempts: job?.opts?.attempts,
        isFinalAttempt,
        error: error.message,
      },
      'Job failed',
    );
  });

  worker.on('stalled', (jobId) => {
    logger.warn({ jobId, queue: worker.name }, 'Job stalled');
  });

  worker.on('error', (error) => {
    logger.error(
      { queue: worker.name, error: error.message },
      'Worker error',
    );
  });

  return worker;
}
