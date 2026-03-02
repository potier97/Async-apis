import logger from '../logger/index.js';

export interface JobRegisterDefinition {
  register: () => void;
  name: string;
}

export function registerJobs(jobs: JobRegisterDefinition[]): void {
  for (const job of jobs) {
    try {
      job.register();
      logger.debug({ jobName: job.name }, 'Registered job handler');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error({ jobName: job.name, error: msg }, 'Failed to register job handler');
    }
  }

  logger.info({ jobCount: jobs.length }, 'All job handlers registered');
}
