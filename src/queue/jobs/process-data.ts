import { z } from 'zod';
import { defineJob, createJobSchema } from '../define-job.js';
import { dataProcessingQueue } from '../queues/index.js';
import logger from '../../logger/index.js';

const processDataSchema = createJobSchema({
  dataId: z.string().min(1),
  processType: z.enum(['type1', 'type2']),
});

export const processDataJob = defineJob({
  name: 'data.process',
  queue: dataProcessingQueue,
  schema: processDataSchema,

  async handler(data, job) {
    logger.info(
      { jobId: job.id, dataId: data.dataId, processType: data.processType },
      'Processing data job',
    );

    // Simulate data fetching
    await new Promise((resolve) => setTimeout(resolve, 500));

    const result = {
      original: data.dataId,
      type: data.processType,
      timestamp: new Date().toISOString(),
      metrics: {
        processed: Math.floor(Math.random() * 1000),
        errors: Math.floor(Math.random() * 10),
      },
    };

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    logger.info(
      { jobId: job.id, dataId: data.dataId, result },
      'Data processing completed',
    );

    return result;
  },
});

export type ProcessDataData = Parameters<typeof processDataJob.create>[0];
