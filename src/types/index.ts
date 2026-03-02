/**
 * API response types
 * Job data types are now inferred from Zod schemas in src/queue/jobs/
 */

export interface ApiResponse {
  success: boolean;
  error?: string;
  jobId?: string;
  status?: string;
  message?: string;
}

export interface JobStatusResponse {
  success: boolean;
  jobId: string;
  state: string;
  progress: number;
  data?: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  failedReason?: string;
  attempts?: number;
}

export interface QueueStats {
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  waiting: number;
}

export interface QueueStatsResponse {
  success: boolean;
  timestamp: string;
  queues: Record<string, QueueStats>;
}
