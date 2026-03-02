import type { Job as BullMQJob } from 'bullmq';
import type { z } from 'zod';
import { NonRetryableError } from './errors.js';

export interface RegisteredHandler {
  schema: z.ZodSchema<unknown>;
  execute: (job: BullMQJob) => Promise<unknown>;
}

const handlerRegistry = new Map<string, RegisteredHandler>();

export function registerHandler(
  jobName: string,
  handler: RegisteredHandler,
): void {
  if (handlerRegistry.has(jobName)) {
    throw new Error(`Handler for job "${jobName}" is already registered`);
  }

  handlerRegistry.set(jobName, handler);
}

export function getHandler(jobName: string): RegisteredHandler {
  const handler = handlerRegistry.get(jobName);

  if (!handler) {
    throw new NonRetryableError(
      `No handler registered for job "${jobName}". Did you forget to call registerJobs()?`,
    );
  }

  return handler;
}

export function clearHandlerRegistry(): void {
  handlerRegistry.clear();
}
