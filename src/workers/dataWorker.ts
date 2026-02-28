/**
 * Data processing worker
 * Processes data transformation and analysis jobs
 */

import type { Job } from 'bullmq';
import logger from '../logger/index.js';
import type {
  DataProcessingJobData,
  DataProcessingJobResult,
  JobProcessor,
} from '../types/index.js';

/**
 * Process data job with full type safety
 */
export const dataProcessor: JobProcessor<
  DataProcessingJobData,
  DataProcessingJobResult
> = async (job: Job<DataProcessingJobData>): Promise<DataProcessingJobResult> => {
  const { dataId, processType } = job.data;

  logger.info(
    { jobId: job.id, dataId, processType },
    'Processing data job',
  );

  try {
    logger.debug({ dataId }, 'Fetching data...');
    await new Promise((resolve) => setTimeout(resolve, 500));

    logger.debug(
      { dataId, processType },
      'Processing data...',
    );

    const processedData: DataProcessingJobResult = {
      original: dataId,
      type: processType,
      timestamp: new Date().toISOString(),
      metrics: {
        processed: Math.floor(Math.random() * 1000),
        errors: Math.floor(Math.random() * 10),
      },
    };

    await new Promise((resolve) => setTimeout(resolve, 1000));

    logger.debug({ dataId }, 'Storing results...');
    await new Promise((resolve) => setTimeout(resolve, 500));

    logger.info(
      { jobId: job.id, dataId, processedData },
      'Data processing completed',
    );

    return processedData;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      { jobId: job.id, dataId, error: errorMessage },
      'Failed to process data',
    );

    throw error;
  }
};

export default dataProcessor;
