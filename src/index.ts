import type { Express } from 'express';
import express from 'express';
import config from './config/index.js';
import logger from './logger/index.js';
import { requestLogger, errorHandler } from './api/middleware.js';
import routes from './api/routes.js';
import { registerJobs } from './queue/job.js';
import { createWorker } from './queue/create-worker.js';
import { closeQueueInstances } from './queue/queue.js';
import { sendEmailJob } from './queue/jobs/send-email.js';
import { processDataJob } from './queue/jobs/process-data.js';
import { emailQueue, dataProcessingQueue } from './queue/queues/index.js';
import type { Worker } from 'bullmq';

const app: Express = express();

// Middleware
app.use(express.json());
app.use(requestLogger);

// Routes
app.use(routes);

// Error handling
app.use(errorHandler);

/**
 * Bootstrap: register all job handlers, then create workers
 */
const initializeWorkers = (): Worker[] => {
  logger.info('Initializing job workers...');

  // 1. Register all job handlers in the registry
  registerJobs([sendEmailJob, processDataJob]);

  // 2. Create workers — they look up handlers from the registry
  const workers = [
    createWorker(emailQueue, { concurrency: config.concurrency }),
    createWorker(dataProcessingQueue, { concurrency: config.concurrency }),
  ];

  logger.info('All workers initialized successfully');
  return workers;
};

/**
 * Graceful shutdown: close workers first, then queues
 */
const setupGracefulShutdown = (workers: Worker[]): void => {
  const shutdown = (): void => {
    logger.info('Received shutdown signal, shutting down gracefully...');

    Promise.allSettled(workers.map((w) => w.close()))
      .then(() => closeQueueInstances())
      .then(() => {
        process.exit(0);
      })
      .catch((error: unknown) => {
        logger.error({ error }, 'Error during shutdown');
        process.exit(1);
      });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

/**
 * Start the server
 */
const startServer = (): void => {
  try {
    const workers = initializeWorkers();
    setupGracefulShutdown(workers);

    const server = app.listen(config.port, config.host, () => {
      logger.info(
        { host: config.host, port: config.port, env: config.env },
        'Server started successfully',
      );
    });

    server.on('error', (error: Error) => {
      logger.error({ error: error.message }, 'Server error');
      process.exit(1);
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ error: msg }, 'Failed to start server');
    process.exit(1);
  }
};

startServer();

export default app;
