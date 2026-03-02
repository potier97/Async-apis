import type { JobsOptions } from 'bullmq';
import type { Job } from './define-job.js';
import type { BaseJobData } from './define-job.js';
import { getOrCreateQueueInstance, closeQueueInstances } from './queue.js';

export async function enqueue<
  TName extends string,
  TData extends BaseJobData,
  TQueueName extends string,
>(
  job: Job<TName, TData, TQueueName>,
  data: TData,
  options?: JobsOptions,
): Promise<string> {
  const { name, data: validatedData, options: jobOptions } = job.create(data);
  const queue = getOrCreateQueueInstance(job.queueName);

  const mergedOptions: JobsOptions = {
    ...jobOptions,
    ...options,
  };

  if (validatedData.idempotencyKey) {
    mergedOptions.jobId = validatedData.idempotencyKey;
  }

  const bullJob = await queue.add(name, validatedData, mergedOptions);

  return bullJob.id ?? '';
}

export async function enqueueBulk<
  TName extends string,
  TData extends BaseJobData,
  TQueueName extends string,
>(job: Job<TName, TData, TQueueName>, items: TData[]): Promise<string[]> {
  const queue = getOrCreateQueueInstance(job.queueName);

  const jobs = items.map((item) => {
    const { name, data, options } = job.create(item);
    const opts = { ...options };

    if (data.idempotencyKey) {
      opts.jobId = data.idempotencyKey;
    }

    return { name, data, opts };
  });

  const bullJobs = await queue.addBulk(jobs);

  return bullJobs.map((j) => j.id ?? '');
}

export async function enqueueDelayed<
  TName extends string,
  TData extends BaseJobData,
  TQueueName extends string,
>(
  job: Job<TName, TData, TQueueName>,
  data: TData,
  delay: number,
): Promise<string> {
  return enqueue(job, data, { delay });
}

export async function closeQueues(): Promise<void> {
  await closeQueueInstances();
}
