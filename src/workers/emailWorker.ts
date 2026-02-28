/**
 * Email worker
 * Processes email sending jobs
 */

import type { Job } from 'bullmq';
import logger from '../logger/index.js';
import type {
  EmailJobData,
  EmailJobResult,
  JobProcessor,
} from '../types/index.js';

/**
 * Process email job with full type safety
 */
export const emailProcessor: JobProcessor<EmailJobData, EmailJobResult> = async (
  job: Job<EmailJobData>,
): Promise<EmailJobResult> => {
  const { email, subject } = job.data;

  logger.info(
    { jobId: job.id, email, subject },
    'Processing email job',
  );

  try {
    if (!email.includes('@')) {
      throw new Error('Invalid email format');
    }
    // throw new Error('Invalid email format');


    logger.debug({ email, subject }, 'Sending email...');

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const result: EmailJobResult = {
      success: true,
      email,
      messageId: `msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    logger.info(
      { jobId: job.id, result },
      'Email sent successfully',
    );

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      { jobId: job.id, email, error: errorMessage },
      'Failed to send email',
    );

    throw error;
  }
};

export default emailProcessor;
