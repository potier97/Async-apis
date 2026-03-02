import type { Router as ExpressRouter, Request, Response } from 'express';
import { Router } from 'express';
import logger from '../logger/index.js';
import { enqueue } from '../queue/client.js';
import { sendEmailJob } from '../queue/jobs/send-email.js';
import { processDataJob } from '../queue/jobs/process-data.js';
import { getOrCreateQueueInstance } from '../queue/queue.js';
import { emailQueue, dataProcessingQueue } from '../queue/queues/index.js';
import type { ApiResponse, JobStatusResponse, QueueStatsResponse, QueueStats } from '../types/index.js';

const router: ExpressRouter = Router();

/**
 * Wraps an async route handler so Express doesn't swallow unhandled rejections.
 * Solves: @typescript-eslint/no-misused-promises
 */
type AsyncHandler = (req: Request, res: Response) => Promise<void>;

function asyncRoute(handler: AsyncHandler): (req: Request, res: Response) => void {
  return (req, res) => {
    handler(req, res).catch((error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error: errorMessage }, 'Unhandled route error');
      res.status(500).json({ success: false, error: errorMessage });
    });
  };
}

/**
 * Extracts the idempotency key from the request header.
 * Returns undefined if not present or empty.
 */
function getIdempotencyKey(req: Request): string | undefined {
  const raw = req.get('X-Idempotency-Key');
  if (!raw) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * POST /jobs/send-email
 * Validates with Zod, enqueues via enqueue()
 * Supports X-Idempotency-Key header for deduplication via Redis
 */
router.post('/jobs/send-email', asyncRoute(async (req: Request, res: Response): Promise<void> => {
  try {
    const idempotencyKey = getIdempotencyKey(req);
    const { email, subject, body } = sendEmailJob.parse({
      ...req.body as Record<string, unknown>,
      idempotencyKey,
    });

    const jobId = await enqueue(sendEmailJob, {
      email,
      subject,
      body,
      idempotencyKey,
    });

    logger.info({ jobId, email, idempotencyKey }, 'Email job submitted');

    const response: ApiResponse = {
      success: true,
      jobId,
      status: 'queued',
      message: 'Email job submitted successfully',
    };

    res.status(202).json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage }, 'Failed to submit email job');
    res.status(400).json({ success: false, error: errorMessage });
  }
}));

/**
 * POST /jobs/process-data
 * Validates with Zod, enqueues via enqueue()
 * Supports X-Idempotency-Key header for deduplication via Redis
 */
router.post('/jobs/process-data', asyncRoute(async (req: Request, res: Response): Promise<void> => {
  try {
    const idempotencyKey = getIdempotencyKey(req);
    const { dataId, processType } = processDataJob.parse({
      ...req.body as Record<string, unknown>,
      idempotencyKey,
    });

    const jobId = await enqueue(processDataJob, {
      dataId,
      processType,
      idempotencyKey,
    });

    logger.info({ jobId, dataId, idempotencyKey }, 'Data processing job submitted');

    const response: ApiResponse = {
      success: true,
      jobId,
      status: 'queued',
      message: 'Data processing job submitted successfully',
    };

    res.status(202).json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage }, 'Failed to submit data processing job');
    res.status(400).json({ success: false, error: errorMessage });
  }
}));

/**
 * GET /jobs/:jobId
 * Search across all queues to find a job by ID
 */
router.get('/jobs/:jobId', asyncRoute(async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const queues = [emailQueue, dataProcessingQueue];

    let job = null;
    for (const queueDef of queues) {
      const queue = getOrCreateQueueInstance(queueDef.name);
      job = await queue.getJob(jobId);
      if (job) break;
    }

    if (!job) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }

    const state = await job.getState();

    const response: JobStatusResponse = {
      success: true,
      jobId: job.id ?? '',
      state,
      progress: 0,
      data: job.data as Record<string, unknown>,
      result: job.returnvalue as Record<string, unknown> | null,
      failedReason: job.failedReason,
      attempts: job.attemptsMade,
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage }, 'Failed to get job status');
    res.status(500).json({ success: false, error: errorMessage });
  }
}));

/**
 * GET /health
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
 * Queue statistics across all queues
 */
router.get('/stats', asyncRoute(async (_req: Request, res: Response): Promise<void> => {
  try {
    const queues = [emailQueue, dataProcessingQueue];
    const stats: Record<string, QueueStats> = {};

    for (const queueDef of queues) {
      const queue = getOrCreateQueueInstance(queueDef.name);
      const counts = await queue.getJobCounts();

      stats[queueDef.name] = {
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
    res.status(500).json({ success: false, error: errorMessage });
  }
}));

export default router;
