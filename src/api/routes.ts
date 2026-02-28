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
 */
router.post('/jobs/send-email', async (req: Request, res: Response) => {
  try {
    const { email, subject, body } = req.body;

    const validatedData = validateJobPayload<EmailJobData>(
      JOB_TYPES.SEND_EMAIL,
      { email, subject, body },
    );

    const queue = getQueue(JOB_TYPES.SEND_EMAIL);
    const job = await queue.add(JOB_TYPES.SEND_EMAIL, validatedData, {
      jobId: uuidv4(),
    });

    logger.info({ jobId: job.id, email }, 'Email job submitted');

    const response: ApiResponse = {
      success: true,
      jobId: job.id,
      status: 'queued',
      message: 'Email job submitted successfully',
    };

    res.status(202).json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage }, 'Failed to submit email job');

    res.status(400).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * POST /jobs/process-data
 * Submit a data processing job to the queue
 */
router.post('/jobs/process-data', async (req: Request, res: Response) => {
  try {
    const { dataId, processType } = req.body;

    const validatedData = validateJobPayload<DataProcessingJobData>(
      JOB_TYPES.PROCESS_DATA,
      { dataId, processType },
    );

    const queue = getQueue(JOB_TYPES.PROCESS_DATA);
    const job = await queue.add(JOB_TYPES.PROCESS_DATA, validatedData, {
      jobId: uuidv4(),
    });

    logger.info({ jobId: job.id, dataId }, 'Data processing job submitted');

    const response: ApiResponse = {
      success: true,
      jobId: job.id,
      status: 'queued',
      message: 'Data processing job submitted successfully',
    };

    res.status(202).json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage }, 'Failed to submit data processing job');

    res.status(400).json({
      success: false,
      error: errorMessage,
    });
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
