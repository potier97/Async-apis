/**
 * Email worker
 * Processes email sending jobs with granular error handling
 */

import type { Job } from 'bullmq';
import logger from '../logger/index.js';
import { handleJobError, ErrorType, createJobError } from '../utils/errorHandler.js';
import type {
  EmailJobData,
  EmailJobResult,
  JobProcessor,
} from '../types/index.js';

/**
 * Process email job with full type safety and granular error handling
 */
export const emailProcessor: JobProcessor<EmailJobData, EmailJobResult> = async (
  job: Job<EmailJobData>,
): Promise<EmailJobResult> => {
  const { email, subject, idempotencyKey } = job.data;

  logger.info(
    { jobId: job.id, email, subject, idempotencyKey },
    'Processing email job',
  );

  try {
    // Validation: Email format
    if (!email.includes('@')) {
      throw createJobError(
        `Invalid email format: ${email}`,
        ErrorType.PERMANENT,
      );
    }

    // Validation: Subject not empty
    if (!subject || subject.trim().length === 0) {
      throw createJobError(
        'Subject cannot be empty',
        ErrorType.PERMANENT,
      );
    }

    logger.debug({ email, subject }, 'Sending email...');

    // Simulate email sending (1 second delay)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const result: EmailJobResult = {
      success: true,
      email,
      messageId: `msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    logger.info(
      { jobId: job.id, email, messageId: result.messageId },
      'Email sent successfully',
    );

    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    logger.error(
      {
        jobId: job.id,
        email,
        attempt: job.attemptsMade + 1,
        error: err.message,
      },
      'Failed to send email',
    );

    // Use granular error handler for specialized retry logic
    return handleJobError(job, err);
  }
};

export default emailProcessor;
