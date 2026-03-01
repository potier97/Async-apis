/**
 * API routes
 * Express routes for job submission and monitoring
 */

import type { Router as ExpressRouter, Request, Response } from 'express';
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getQueue } from '../queues/index.js';
import { validateJobPayload } from '../jobs/schemas.js';
import JOB_TYPES from '../jobs/types.js';
import logger from '../logger/index.js';
import type {
  EmailJobData,
  DataProcessingJobData,
  ApiResponse,
  JobStatusResponse,
  QueueStatsResponse,
} from '../types/index.js';

const router: ExpressRouter = Router();

/**
 * POST /jobs/send-email
 * Submit an email job to the queue
 * Supports X-Idempotency-Key header for idempotent operations
 * If key is provided, uses it as jobId for automatic deduplication via Redis
 */
router.post('/jobs/send-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, subject, body } = req.body;
    const idempotencyKey = (req.get('X-Idempotency-Key') || '').trim();

    const validatedData = validateJobPayload<EmailJobData>(
      JOB_TYPES.SEND_EMAIL,
      { email, subject, body, idempotencyKey },
    );

    const queue = getQueue(JOB_TYPES.SEND_EMAIL);
    const jobId = idempotencyKey || uuidv4();

    let job = await queue.add(JOB_TYPES.SEND_EMAIL, validatedData, {
      jobId,
    }).catch(async (error) => {
      // If job already exists (duplicate idempotency key), fetch it
      if (error.message.includes('NOSCRIPT') || jobId === idempotencyKey) {
        const existingJob = await queue.getJob(jobId);
        if (existingJob) {
          logger.info(
            { jobId, idempotencyKey },
            'Job with this idempotency key already exists, returning existing job',
          );
          return existingJob;
        }
      }
      throw error;
    });

    if (!job) {
      throw new Error('Failed to create or retrieve job');
    }

    const state = await job.getState();
    const status = idempotencyKey && state !== 'waiting'
      ? 'cached'
      : 'queued';

    logger.info(
      { jobId: job.id, email, idempotencyKey, status },
      'Email job submitted',
    );

    const response: ApiResponse = {
      success: true,
      jobId: job.id ?? '',
      status,
      message: status === 'cached'
        ? 'This request was already processed'
        : 'Email job submitted successfully',
    };

    const statusCode = status === 'cached' ? 200 : 202;
    res.status(statusCode).json(response);
    return;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage }, 'Failed to submit email job');

    res.status(400).json({
      success: false,
      error: errorMessage,
    });
    return;
  }
});

/**
 * POST /jobs/process-data
 * Submit a data processing job to the queue
 * Supports X-Idempotency-Key header for idempotent operations
 * If key is provided, uses it as jobId for automatic deduplication via Redis
 */
router.post('/jobs/process-data', async (req: Request, res: Response): Promise<void> => {
  try {
    const { dataId, processType } = req.body;
    const idempotencyKey = (req.get('X-Idempotency-Key') || '').trim();

    const validatedData = validateJobPayload<DataProcessingJobData>(
      JOB_TYPES.PROCESS_DATA,
      { dataId, processType, idempotencyKey },
    );

    const queue = getQueue(JOB_TYPES.PROCESS_DATA);
    const jobId = idempotencyKey || uuidv4();

    let job = await queue.add(JOB_TYPES.PROCESS_DATA, validatedData, {
      jobId,
    }).catch(async (error) => {
      // If job already exists (duplicate idempotency key), fetch it
      if (error.message.includes('NOSCRIPT') || jobId === idempotencyKey) {
        const existingJob = await queue.getJob(jobId);
        if (existingJob) {
          logger.info(
            { jobId, idempotencyKey },
            'Job with this idempotency key already exists, returning existing job',
          );
          return existingJob;
        }
      }
      throw error;
    });

    if (!job) {
      throw new Error('Failed to create or retrieve job');
    }

    const state = await job.getState();
    const status = idempotencyKey && state !== 'waiting'
      ? 'cached'
      : 'queued';

    logger.info(
      { jobId: job.id, dataId, idempotencyKey, status },
      'Data processing job submitted',
    );

    const response: ApiResponse = {
      success: true,
      jobId: job.id ?? '',
      status,
      message: status === 'cached'
        ? 'This request was already processed'
        : 'Data processing job submitted successfully',
    };

    const statusCode = status === 'cached' ? 200 : 202;
    res.status(statusCode).json(response);
    return;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage }, 'Failed to submit data processing job');

    res.status(400).json({
      success: false,
      error: errorMessage,
    });
    return;
  }
});

/**
 * GET /jobs/:jobId
 * Get job status and details
 */
router.get('/jobs/:jobId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;

    let job = null;
    for (const jobType of Object.values(JOB_TYPES)) {
      const queue = getQueue(jobType);
      job = await queue.getJob(jobId);
      if (job) break;
    }

    if (!job) {
      res.status(404).json({
        success: false,
        error: 'Job not found',
      });
      return;
    }

    const state = await job.getState();

    const response: JobStatusResponse = {
      success: true,
      jobId: job.id ?? '',
      state,
      progress: 0,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      attempts: job.attemptsMade,
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage }, 'Failed to get job status');

    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response): void => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /stats
 * Get queue statistics and metrics
 */
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats: Record<string, any> = {};

    for (const jobType of Object.values(JOB_TYPES)) {
      const queue = getQueue(jobType);
      const counts = await queue.getJobCounts();

      stats[jobType] = {
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
        waiting: counts.waiting || 0,
      };
    }

    const response: QueueStatsResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      queues: stats,
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage }, 'Failed to get queue stats');

    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

export default router;
