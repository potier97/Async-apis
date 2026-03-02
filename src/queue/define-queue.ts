import type { JobsOptions } from 'bullmq';

interface QueueDefinition<TName extends string> {
  name: TName;
  defaultJobOptions?: JobsOptions;
}

export interface Queue<TName extends string> {
  readonly name: TName;
  readonly defaultJobOptions: JobsOptions;
}

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: {
    age: 3600,
    count: 1000,
  },
  removeOnFail: {
    age: 86400,
    count: 5000,
  },
};

export function defineQueue<TName extends string>(
  definition: QueueDefinition<TName>,
): Queue<TName> {
  return {
    name: definition.name,
    defaultJobOptions: {
      ...DEFAULT_JOB_OPTIONS,
      ...definition.defaultJobOptions,
    },
  };
}
