import { z } from 'zod';
import type { Job as BullMQJob, JobsOptions } from 'bullmq';
import type { Queue } from './define-queue.js';
import { registerHandler } from './handler.js';

export const baseJobSchema = z.object({
  idempotencyKey: z.string().optional(),
  metadata: z
    .object({
      triggeredBy: z.string().optional(),
      correlationId: z.string().optional(),
    })
    .optional(),
});

export type BaseJobData = z.infer<typeof baseJobSchema>;

/**
 * Helper to create a job schema that extends baseJobSchema.
 * The resulting schema includes idempotencyKey and metadata automatically.
 *
 * Usage:
 *   const mySchema = createJobSchema({ email: z.string().email() });
 *   // Inferred type: { email: string; idempotencyKey?: string; metadata?: {...} }
 */
export function createJobSchema<T extends z.ZodRawShape>(shape: T) {
  return baseJobSchema.extend(shape);
}

type HandlerFn<TData, TResult> = (
  data: TData,
  job: BullMQJob<TData>,
) => Promise<TResult>;

export interface JobDefinition<
  TName extends string,
  TQueueName extends string,
  TSchema extends ReturnType<typeof createJobSchema>,
  TResult = unknown,
> {
  name: TName;
  queue: Queue<TQueueName>;
  schema: TSchema;
  options?: JobsOptions;
  handler: HandlerFn<z.infer<TSchema>, TResult>;
}

export interface Job<TName extends string, TData, TQueueName extends string> {
  readonly name: TName;
  readonly queueName: TQueueName;
  readonly options: JobsOptions;

  create(data: TData): { name: TName; data: TData; options: JobsOptions };
  parse(data: unknown): TData;
  register(): void;
}

export function defineJob<
  TName extends string,
  TQueueName extends string,
  TSchema extends ReturnType<typeof createJobSchema>,
  TResult = unknown,
>(
  definition: JobDefinition<TName, TQueueName, TSchema, TResult>,
): Job<TName, z.infer<TSchema>, TQueueName> {
  type TData = z.infer<TSchema>;

  const jobOptions: JobsOptions = {
    ...definition.queue.defaultJobOptions,
    ...definition.options,
  };

  return {
    name: definition.name,
    queueName: definition.queue.name,
    options: jobOptions,

    create(data: TData) {
      const validated = definition.schema.parse(data) as TData;
      return {
        name: definition.name,
        data: validated,
        options: jobOptions,
      };
    },

    parse(data: unknown): TData {
      return definition.schema.parse(data) as TData;
    },

    register() {
      registerHandler(definition.name, {
        schema: definition.schema,
        execute: async (bullJob: BullMQJob) => {
          return definition.handler(
            bullJob.data as TData,
            bullJob as BullMQJob<TData>,
          );
        },
      });
    },
  };
}
