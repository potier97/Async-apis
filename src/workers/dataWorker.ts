/**
 * Data processing worker
 * Processes data transformation and analysis jobs with granular error handling
 */

import type { Job } from 'bullmq';
import logger from '../logger/index.js';
import { handleJobError, ErrorType, createJobError } from '../utils/errorHandler.js';
import type {
  DataProcessingJobData,
  DataProcessingJobResult,
  JobProcessor,
} from '../types/index.js';

/**
 * Process data job with full type safety and granular error handling
 */
export const dataProcessor: JobProcessor<
  DataProcessingJobData,
  DataProcessingJobResult
> = async (job: Job<DataProcessingJobData>): Promise<DataProcessingJobResult> => {
  const { dataId, processType, idempotencyKey } = job.data;

  logger.info(
    { jobId: job.id, dataId, processType, idempotencyKey },
    'Processing data job',
  );

  try {
    // Validation
    if (!dataId || dataId.trim().length === 0) {
      throw createJobError(
        'dataId cannot be empty',
        ErrorType.PERMANENT,
      );
    }

    if (!['type1', 'type2'].includes(processType)) {
      throw createJobError(
        `Invalid processType: ${processType}. Must be 'type1' or 'type2'`,
        ErrorType.PERMANENT,
      );
    }

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
      { jobId: job.id, dataId, result: processedData },
      'Data processing completed',
    );

    return processedData;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    logger.error(
      {
        jobId: job.id,
        dataId,
        attempt: job.attemptsMade + 1,
        error: err.message,
      },
      'Failed to process data',
    );

    // Use granular error handler for specialized retry logic
    return handleJobError(job, err);
  }
};

export default dataProcessor;
