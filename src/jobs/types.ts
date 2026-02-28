/**
 * Job type definitions
 * Centralized definitions of job types for type safety
 */

export const JOB_TYPES = {
  SEND_EMAIL: 'send-email',
  PROCESS_DATA: 'process-data',
  GENERATE_REPORT: 'generate-report',
} as const;

// Type-safe job type
export type JobType = typeof JOB_TYPES[keyof typeof JOB_TYPES];

export default JOB_TYPES;
