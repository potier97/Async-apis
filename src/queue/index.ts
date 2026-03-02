// Core definitions
export { defineQueue } from './define-queue.js';
export { defineJob, baseJobSchema, createJobSchema } from './define-job.js';
export type { Queue } from './define-queue.js';
export type { Job, BaseJobData, JobDefinition } from './define-job.js';

// Handler registry
export { registerHandler, getHandler, clearHandlerRegistry } from './handler.js';
export type { RegisteredHandler } from './handler.js';

// Errors
export {
  NonRetryableError,
  RetryableError,
  classifyError,
  wrapJobError,
} from './errors.js';

// Connections
export { createQueueConnection, createWorkerConnection } from './connection.js';

// Queue instances
export { getOrCreateQueueInstance, closeQueueInstances } from './queue.js';

// Client (enqueue)
export { enqueue, enqueueBulk, enqueueDelayed, closeQueues } from './client.js';

// Worker factory
export { createWorker } from './create-worker.js';

// Job registration
export { registerJobs } from './job.js';

// Concrete queues
export { emailQueue, dataProcessingQueue } from './queues/index.js';

// Concrete jobs
export { sendEmailJob, processDataJob } from './jobs/index.js';
export type { SendEmailData, ProcessDataData } from './jobs/index.js';
