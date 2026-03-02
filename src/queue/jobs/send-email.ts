import { z } from 'zod';
import { defineJob, createJobSchema } from '../define-job.js';
import { emailQueue } from '../queues/index.js';
import logger from '../../logger/index.js';

const sendEmailSchema = createJobSchema({
  email: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export const sendEmailJob = defineJob({
  name: 'email.send',
  queue: emailQueue,
  schema: sendEmailSchema,

  async handler(data, job) {
    logger.info({ jobId: job.id, email: data.email }, 'Sending email');

    // Simulate email sending
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const result = {
      success: true as const,
      email: data.email,
      messageId: `msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    logger.info(
      { jobId: job.id, email: data.email, messageId: result.messageId },
      'Email sent successfully',
    );

    return result;
  },
});

export type SendEmailData = Parameters<typeof sendEmailJob.create>[0];
