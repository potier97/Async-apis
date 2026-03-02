import { defineQueue } from '../define-queue.js';

export const emailQueue = defineQueue({
  name: 'email',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
});

export const dataProcessingQueue = defineQueue({
  name: 'data-processing',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
});
