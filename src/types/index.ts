/**
 * Global type definitions
 */

import type { Job } from 'bullmq';

/**
 * Job processor function type
 */
export type JobProcessor<T = any, R = any> = (job: Job<T>) => Promise<R>;

/**
 * Queue configuration
 */
export interface QueueConfig {
  host: string;
  port: number;
  db: number;
  password?: string;
}

/**
 * Base job data with idempotency support
 */
export interface BaseJobData {
  idempotencyKey?: string;
}

/**
 * Email job data
 */
export interface EmailJobData extends BaseJobData {
  email: string;
  subject: string;
  body: string;
}

/**
 * Email job result
 */
export interface EmailJobResult {
  success: boolean;
  email: string;
  messageId: string;
  timestamp: string;
}

/**
 * Data processing job data
 */
export interface DataProcessingJobData extends BaseJobData {
  dataId: string;
  processType: 'type1' | 'type2';
}

/**
 * Data processing job result
 */
export interface DataProcessingJobResult {
  original: string;
  type: string;
  timestamp: string;
  metrics: {
    processed: number;
    errors: number;
  };
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  jobId?: string;
  status?: string;
  message?: string;
}

/**
 * Job status response
 */
export interface JobStatusResponse {
  success: boolean;
  jobId: string;
  state: string;
  progress: number;
  data?: any;
  result?: any;
  failedReason?: string;
  attempts?: number;
}

/**
 * Queue stats response
 */
export interface QueueStatsResponse {
  success: boolean;
  timestamp: string;
  queues: Record<string, {
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    waiting: number;
  }>;
}

/**
 * Idempotency record (stored in cache/database)
 */
export interface IdempotencyRecord {
  idempotencyKey: string;
  jobId: string;
  jobType: string;
  result: any;
  createdAt: Date;
  expiresAt: Date;
}
