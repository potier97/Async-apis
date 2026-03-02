# BullMQ Professional Project

A production-ready job queue system built with **BullMQ**, **Express.js**, **TypeScript**, and **Zod** using a declarative definition-based architecture.

## What is BullMQ?

**BullMQ** is a Node.js library for managing job queues using Redis. It helps you:
- **Defer work**: Submit jobs that execute asynchronously
- **Distribute processing**: Run multiple workers processing jobs concurrently
- **Retry failed jobs**: Automatically retry with exponential backoff
- **Scale horizontally**: Run multiple instances against shared Redis

## Quick Start

### Prerequisites
- **Node.js** >=18.0.0
- **pnpm** (package manager)
- **Redis** (running locally on port 6379, or update `.env`)

### Installation

```bash
# 1. Install dependencies
pnpm install

# 2. Start Redis
docker-compose -f docker-compose.dev.yml up

# 3. Start development server (auto-reload)
pnpm run dev

# 4. Test the API
curl http://localhost:3000/health
```

The server will start on `http://localhost:3000`

## API Endpoints

### Submit Email Job

```bash
curl -X POST http://localhost:3000/jobs/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "subject": "Hello",
    "body": "This is a test email"
  }'

# Response (202):
{
  "success": true,
  "jobId": "1",
  "status": "queued",
  "message": "Email job submitted successfully"
}
```

### Submit Data Processing Job

```bash
curl -X POST http://localhost:3000/jobs/process-data \
  -H "Content-Type: application/json" \
  -d '{
    "dataId": "550e8400-e29b-41d4-a716-446655440000",
    "processType": "type1"
  }'
```

### Check Job Status

```bash
curl http://localhost:3000/jobs/{jobId}
```

### View Queue Statistics

```bash
curl http://localhost:3000/stats
```

### Health Check

```bash
curl http://localhost:3000/health
```

### Idempotent Requests (Prevent Duplicates)

Use the `X-Idempotency-Key` header to ensure a job is created exactly once:

```bash
curl -X POST http://localhost:3000/jobs/send-email \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: order-2024-12345" \
  -d '{
    "email": "user@example.com",
    "subject": "Order Confirmation",
    "body": "Your order #12345 has been placed"
  }'
```

- The idempotency key becomes the `jobId` in Redis
- Redis prevents duplicate job IDs automatically
- Works across multiple instances (one Redis, shared deduplication)
- If the network fails, retry with the same key safely

## Architecture

### Declarative Definition-Based System

The queue system uses a **definition-based pattern** where each component is a pure function:

```
defineQueue() → immutable queue config
createJobSchema() → Zod schema with base fields
defineJob() → job object with .create(), .parse(), .register()
enqueue() → validates + adds to Redis
createWorker() → worker with handler lookup + error wrapping
registerJobs() → registers all handlers before workers start
```

### Data Flow

1. **Job Submission**: Client POSTs to `/jobs/...` endpoint
2. **Validation**: Zod validates payload via `enqueue()` → `job.create()`
3. **Queuing**: Job added to Redis (idempotencyKey becomes jobId if present)
4. **Worker Pickup**: Worker pulls job, looks up handler in registry by name
5. **Schema Validation**: Worker re-validates data with Zod schema
6. **Processing**: Handler executes the job logic
7. **Error Wrapping**: `wrapJobError()` converts errors to BullMQ-native types
8. **Completion/Retry**: BullMQ handles retry (exponential backoff) or marks complete

### Project Structure

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
│   └── index.ts                    API response types
│
└── index.ts                        Entry point: registerJobs + createWorker + Express
```

## Error Handling

Errors are classified and converted to BullMQ-native types:

| Error Type | Class | BullMQ Behavior |
|---|---|---|
| Fatal (invalid data) | `NonRetryableError` | Converted to `UnrecoverableError` - no retry |
| Temporary (network) | `RetryableError` | Regular `Error` - BullMQ retries with backoff |
| Unknown | Classified automatically | HTTP 4xx = fatal, everything else = retry |

Retry config: 3 attempts, exponential backoff (2s, 4s, 8s).

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

## Development Commands

```bash
pnpm run dev           # Start dev server (auto-reload with tsx)
pnpm run build         # Compile TypeScript
pnpm run type-check    # Type-check without emitting
pnpm run lint          # ESLint with auto-fix
pnpm test              # Run tests
pnpm run dev:pm2       # Start with PM2 process manager
pnpm run pm2:monit     # PM2 monitoring dashboard
```

## Configuration

Edit `.env`:

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
CONCURRENCY=5
JOB_TIMEOUT=300000
```

## Dependencies

| Package | Purpose |
|---|---|
| bullmq | Job queue system with Redis |
| express | HTTP server |
| zod | Schema validation + TypeScript type inference |
| pino + pino-pretty | Structured logging |
| dotenv | Environment variables |

## Troubleshooting

### Redis Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
Start Redis: `docker-compose -f docker-compose.dev.yml up`

### Job Not Processing
1. Check logs: `pnpm run dev` shows Pino structured logs
2. Verify handlers registered: look for "All job handlers registered" in logs
3. Check `/stats` endpoint for queue counts

### Debug a Failing Worker
1. Set `LOG_LEVEL=debug` in `.env`
2. Run `pnpm run dev`
3. Submit a job and watch logs for the full lifecycle

## License

MIT
