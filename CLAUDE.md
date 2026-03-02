# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A production-ready job queue system built with **BullMQ**, **Express.js**, **TypeScript**, and **Zod v4** using a **declarative definition-based architecture**. All job definitions (schema + handler) are co-located, validated with Zod, and type-safe end-to-end.

## Architecture

### Declarative Definition-Based System

Each component is a pure function that produces an immutable, typed object:

```
defineQueue()      → immutable queue config
createJobSchema()  → Zod schema with base fields (idempotencyKey, metadata)
defineJob()        → job object with .create(), .parse(), .register()
enqueue()          → validates + adds to Redis
createWorker()     → worker with handler lookup + error wrapping
registerJobs()     → registers all handlers before workers start
```

### Data Flow

1. Client POSTs to `/jobs/...` endpoint
2. Zod validates payload via `job.parse()`
3. `enqueue()` adds job to Redis (idempotencyKey becomes jobId if present)
4. Worker pulls job, looks up handler in registry by name
5. Worker re-validates data with Zod schema
6. Handler executes the job logic
7. `wrapJobError()` converts errors to BullMQ-native types
8. BullMQ handles retry (exponential backoff) or marks complete

### Core Components

1. **Queue Definition** (`src/queue/define-queue.ts`)
   - `defineQueue()` — pure function producing immutable queue config with defaults

2. **Job Definition** (`src/queue/define-job.ts`)
   - `createJobSchema()` — extends `baseJobSchema` with custom fields via `.extend()`
   - `defineJob()` — produces a typed job object with `.create()`, `.parse()`, `.register()`
   - `baseJobSchema` — shared fields: `idempotencyKey?`, `metadata?`

3. **Handler Registry** (`src/queue/handler.ts`)
   - Centralized `Map<jobName, handler>` — workers look up handlers by name
   - `registerHandler()`, `getHandler()`, `clearHandlerRegistry()`

4. **Error System** (`src/queue/errors.ts`)
   - `NonRetryableError` → BullMQ `UnrecoverableError` (no retry)
   - `RetryableError` → regular Error (BullMQ retries with backoff)
   - `wrapJobError()` classifies and converts errors automatically

5. **Redis Connections** (`src/queue/connection.ts`)
   - Separate connections for queue (non-blocking) and worker (blocking BRPOPLPUSH)

6. **Queue Client** (`src/queue/client.ts`)
   - `enqueue()`, `enqueueBulk()`, `enqueueDelayed()`
   - Auto-maps `idempotencyKey` to Redis `jobId`

7. **Worker Factory** (`src/queue/create-worker.ts`)
   - `createWorker()` — factory with handler lookup, schema validation, `wrapJobError()`, and event listeners

8. **API Routes** (`src/api/routes.ts`)
   - `asyncRoute()` wrapper solves Express async handler typing
   - `getIdempotencyKey()` extracts `X-Idempotency-Key` header
   - Routes use `job.parse()` + `enqueue()` pattern

9. **Configuration** (`src/config/`)
   - Centralized config with environment validation
   - Supports dev/test/prod via NODE_ENV

10. **Logging** (`src/logger/index.ts`)
    - Pino: pretty-print in dev, JSON in prod
    - Never use `console.log`

## Project Structure

```
src/
├── queue/                          Core queue system
│   ├── define-queue.ts             defineQueue() - pure queue configuration
│   ├── define-job.ts               defineJob() + createJobSchema() + baseJobSchema
│   ├── handler.ts                  Handler registry (Map<jobName, handler>)
│   ├── errors.ts                   NonRetryableError, RetryableError, wrapJobError()
│   ├── connection.ts               Separate Redis connections for queue/worker
│   ├── queue.ts                    Singleton Queue instances
│   ├── client.ts                   enqueue(), enqueueBulk(), enqueueDelayed()
│   ├── create-worker.ts            createWorker() factory with event listeners
│   ├── job.ts                      registerJobs()
│   ├── queues/
│   │   └── index.ts                emailQueue, dataProcessingQueue
│   ├── jobs/
│   │   ├── send-email.ts           sendEmailJob = defineJob({...})
│   │   ├── process-data.ts         processDataJob = defineJob({...})
│   │   └── index.ts
│   └── index.ts                    Public barrel exports
│
├── api/
│   ├── routes.ts                   HTTP endpoints using enqueue()
│   └── middleware.ts               Request logging, error handling
│
├── config/
│   ├── index.ts                    App configuration with validation
│   └── redis.ts                    Redis connection config
│
├── logger/
│   └── index.ts                    Pino logger (pretty in dev, JSON in prod)
│
├── types/
│   └── index.ts                    API response types (ApiResponse, JobStatusResponse, QueueStats)
│
├── __tests__/
│   ├── api.test.ts                 API route integration tests
│   └── jobs.test.ts                Job schema validation tests
│
└── index.ts                        Entry point: registerJobs + createWorker + Express
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/jobs/send-email` | Submit email job |
| POST | `/jobs/process-data` | Submit data processing job |
| GET | `/jobs/:jobId` | Get job status and details |
| GET | `/stats` | Queue statistics across all queues |
| GET | `/health` | Health check |

All POST endpoints support `X-Idempotency-Key` header for deduplication.

## Development Commands

```bash
pnpm install            # Install dependencies
pnpm run dev            # Start dev server (auto-reload with tsx)
pnpm run build          # Compile TypeScript
pnpm run type-check     # Type-check without emitting
pnpm run lint           # ESLint with auto-fix
pnpm test               # Run tests with coverage
pnpm run dev:pm2        # Start with PM2 process manager
pnpm run pm2:monit      # PM2 monitoring dashboard
```

**Important**: This project uses **pnpm** as package manager, not npm.

## Adding a New Job Type

### 1. Define the queue (if new)

```typescript
// src/queue/queues/index.ts
export const reportQueue = defineQueue({
  name: 'reports',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
});
```

### 2. Define the job (schema + handler in one place)

```typescript
// src/queue/jobs/generate-report.ts
import { z } from 'zod';
import { defineJob, createJobSchema } from '../define-job.js';
import { reportQueue } from '../queues/index.js';

const generateReportSchema = createJobSchema({
  reportType: z.string().min(1),
  userId: z.string().min(1),
});

export const generateReportJob = defineJob({
  name: 'report.generate',
  queue: reportQueue,
  schema: generateReportSchema,

  async handler(data, job) {
    // data is fully typed: { reportType, userId, idempotencyKey?, metadata? }
    return { reportUrl: `https://.../${data.userId}` };
  },
});
```

### 3. Register and create worker

```typescript
// src/index.ts
import { generateReportJob } from './queue/jobs/generate-report.js';
import { reportQueue } from './queue/queues/index.js';

registerJobs([sendEmailJob, processDataJob, generateReportJob]);

const workers = [
  createWorker(emailQueue, { concurrency: 5 }),
  createWorker(dataProcessingQueue, { concurrency: 5 }),
  createWorker(reportQueue, { concurrency: 3 }),
];
```

### 4. Add API route

```typescript
// src/api/routes.ts
router.post('/jobs/generate-report', asyncRoute(async (req, res) => {
  const idempotencyKey = getIdempotencyKey(req);
  const { reportType, userId } = generateReportJob.parse({
    ...req.body as Record<string, unknown>,
    idempotencyKey,
  });

  const jobId = await enqueue(generateReportJob, { reportType, userId, idempotencyKey });
  res.status(202).json({ success: true, jobId, status: 'queued' });
}));
```

## Key Patterns

### 1. Schema Validation with Zod v4
- All schemas use `createJobSchema()` which extends `baseJobSchema` with `.extend()`
- Type inference flows from schema → handler → route automatically
- Never use `any` or `unknown` workarounds — use Zod parsing for type narrowing

### 2. Error Handling
- `NonRetryableError`: Invalid data, bad config → BullMQ `UnrecoverableError` (no retry)
- `RetryableError`: Network issues, timeouts → BullMQ retries with exponential backoff
- `wrapJobError()`: Auto-classifies unknown errors (HTTP 4xx = fatal, else retry)
- Retry config: 3 attempts, exponential backoff (2s, 4s, 8s)

### 3. Type Safety
- Strict TypeScript mode enabled
- Zero `any` or `unknown` workarounds in application code
- Single `eslint-disable` for Pino's `ThreadStream` typed as `any` (library issue)
- `asyncRoute()` wrapper solves `@typescript-eslint/no-misused-promises`
- `req.body` cast to `Record<string, unknown>` then immediately parsed with Zod

### 4. Idempotency via Redis
- `X-Idempotency-Key` header → becomes `jobId` in Redis
- Redis prevents duplicate jobIds automatically
- Works across multiple instances (shared Redis)

### 5. Structured Logging
- Use Pino for all logging (never `console.log`)
- Include context: `logger.info({ jobId, email }, 'message')`
- Pretty-print in dev, JSON in production

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| NODE_ENV | development | Environment (development/test/production) |
| REDIS_HOST | localhost | Redis server host |
| REDIS_PORT | 6379 | Redis server port |
| PORT | 3000 | Express server port |
| LOG_LEVEL | info | Logging level (trace/debug/info/warn/error/fatal) |
| CONCURRENCY | 5 | Jobs per worker to process simultaneously |
| JOB_TIMEOUT | 300000 | Max job duration in milliseconds (5 min) |

## Dependencies

| Package | Purpose |
|---------|---------|
| bullmq | Job queue system with Redis |
| express | HTTP server |
| zod | Schema validation + TypeScript type inference |
| pino + pino-pretty | Structured logging |
| dotenv | Environment variables |

## Testing

- Tests located in `src/__tests__/`
- `api.test.ts`: API route integration tests using supertest
- `jobs.test.ts`: Job schema validation tests using Zod
- Run with: `pnpm test`

## Debugging

- Set `LOG_LEVEL=debug` in `.env` for verbose logs
- `GET /stats` shows queue counts (waiting, active, completed, failed)
- `GET /jobs/:jobId` shows full job details including errors
- Redis CLI: `redis-cli KEYS bullmq:*` to inspect queues directly
