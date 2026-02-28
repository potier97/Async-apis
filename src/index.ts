/**
 * Main application entry point
 * Sets up Express server and BullMQ workers
 */

import type { Express } from 'express';
import express from 'express';
import config from './config/index.js';
import logger from './logger/index.js';
import { registerWorker, closeAll } from './queues/index.js';
import { requestLogger, errorHandler } from './api/middleware.js';
import routes from './api/routes.js';
import JOB_TYPES from './jobs/types.js';
import { emailProcessor } from './workers/emailWorker.js';
import { dataProcessor } from './workers/dataWorker.js';

const app: Express = express();

// Middleware
app.use(express.json());
app.use(requestLogger);

// Routes
app.use(routes);

// Error handling
app.use(errorHandler);

/**
 * Initialize workers for job queues
 */
const initializeWorkers = async (): Promise<void> => {
  logger.info('Initializing job workers...');

  try {
    registerWorker(JOB_TYPES.SEND_EMAIL, emailProcessor);
    registerWorker(JOB_TYPES.PROCESS_DATA, dataProcessor);

    logger.info('All workers initialized successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize workers');
    process.exit(1);
  }
};

/**
 * Graceful shutdown handler
 */
const setupGracefulShutdown = (): void => {
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      try {
        await closeAll();
        process.exit(0);
      } catch (error) {
        logger.error({ error }, 'Error during shutdown');
        process.exit(1);
      }
    });
  });
};

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
  try {
    await initializeWorkers();
    setupGracefulShutdown();

    const server = app.listen(config.port, config.host, () => {
      logger.info(
        { host: config.host, port: config.port, env: config.env },
        'Server started successfully',
      );
    });

    server.on('error', (error) => {
      logger.error({ error }, 'Server error');
      process.exit(1);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
};

startServer();

export default app;
