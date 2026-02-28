/**
 * Job payload validation schemas
 * Uses Joi for input validation
 */

import Joi from 'joi';
import JOB_TYPES from './types.js';
import type { EmailJobData, DataProcessingJobData } from '../types/index.js';

export const jobSchemas = {
  [JOB_TYPES.SEND_EMAIL]: Joi.object<EmailJobData>({
    email: Joi.string().email().required(),
    subject: Joi.string().required(),
    body: Joi.string().required(),
  }),

  [JOB_TYPES.PROCESS_DATA]: Joi.object<DataProcessingJobData>({
    dataId: Joi.string().uuid().required(),
    processType: Joi.string().valid('type1', 'type2').required(),
  }),

  [JOB_TYPES.GENERATE_REPORT]: Joi.object({
    reportType: Joi.string().required(),
    userId: Joi.string().uuid().required(),
    filters: Joi.object().optional(),
  }),
};

/**
 * Validate job payload
 * @param jobType - Job type identifier
 * @param data - Data to validate
 * @throws {Error} If validation fails
 * @returns {object} Validated data
 */
export const validateJobPayload = <T extends Record<string, any>>(
  jobType: string,
  data: any,
): T => {
  const schema = jobSchemas[jobType as keyof typeof jobSchemas];

  if (!schema) {
    throw new Error(`No schema defined for job type: ${jobType}`);
  }

  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.map((d) => d.message).join(', ');
    throw new Error(`Validation error: ${messages}`);
  }

  return value as T;
};
