# BullMQ Professional Project

A production-ready job queue system built with **BullMQ**, **Express.js**, and **Node.js** demonstrating best practices for observability, scalability, and maintainability.

## What is BullMQ?

**BullMQ** is a Node.js library for managing job queues using Redis. It helps you:
- **Defer work**: Submit jobs that execute asynchronously
- **Distribute processing**: Run multiple workers processing jobs concurrently
- **Retry failed jobs**: Automatically retry with exponential backoff
- **Track progress**: Monitor job execution in real-time
- **Scale horizontally**: Run multiple instances against shared Redis

### When to Use Job Queues?

✅ **Good Use Cases:**
- Sending emails (slow, can fail)
- Image/video processing
- Data transformations
- Generating reports
- Heavy computations
- Webhooks and notifications

❌ **Bad Use Cases:**
- Real-time synchronous operations
- Simple database queries
- Trivial operations (can just be in-process)

## Quick Start

### Prerequisites
- **Node.js** ≥18.0.0
- **Redis** (running locally on port 6379, or update `.env`)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Start Redis (if not already running)
redis-server

# 3. Start development server
npm run dev

# 4. Open new terminal and monitor queues
npm run queue:monitor
```

The server will start on `http://localhost:3000`

## API Examples

### Submit Email Job

```bash
curl -X POST http://localhost:3000/jobs/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "subject": "Hello",
    "body": "This is a test email"
  }'

# Response:
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
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
curl http://localhost:3000/jobs/550e8400-e29b-41d4-a716-446655440000

# Response:
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "state": "active",
  "progress": 50,
  "data": { ... },
  "result": null,
  "attempts": 1
}
```

### View Queue Statistics

```bash
curl http://localhost:3000/stats

# Response:
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "queues": {
    "send-email": {
      "waiting": 5,
      "active": 2,
      "completed": 150,
      "failed": 3,
      "delayed": 0
    },
    "process-data": {
      "waiting": 0,
      "active": 1,
      "completed": 45,
      "failed": 0,
      "delayed": 0
    }
  }
}
```

### Idempotent Requests (Prevent Duplicates)

Use the `X-Idempotency-Key` header to ensure requests are processed exactly once, even if sent multiple times. This is critical for preventing duplicate work (e.g., multiple emails sent, duplicate charges).

**How It Works:**
- The idempotency key becomes the `jobId` in Redis
- Redis prevents duplicate job IDs automatically
- If 2+ instances receive the same key, only one creates the job
- Other instances retrieve the existing job from Redis

**Send email with idempotency key:**
```bash
curl -X POST http://localhost:3000/jobs/send-email \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: order-2024-12345" \
  -d '{
    "email": "user@example.com",
    "subject": "Order Confirmation",
    "body": "Your order #12345 has been placed"
  }'

# Response (first time):
{
  "success": true,
  "jobId": "order-2024-12345",
  "status": "queued"
}
```

**Send the exact same request again (with same key):**
```bash
curl -X POST http://localhost:3000/jobs/send-email \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: order-2024-12345" \
  -d '{
    "email": "user@example.com",
    "subject": "Order Confirmation",
    "body": "Your order #12345 has been placed"
  }'

# Response (second time - from Redis):
{
  "success": true,
  "jobId": "order-2024-12345",
  "status": "cached",
  "message": "This request was already processed"
}
```

**Key Points:**
- Same `X-Idempotency-Key` = Same result (no duplicates)
- **Redis is the single source of truth** - no separate cache needed
- **Scales across multiple instances**: One Redis, all instances share the deduplication logic
- Works with all job endpoints: `/jobs/send-email`, `/jobs/process-data`
- If network fails, retry with same key - no duplicate jobs created

**Best Practices:**
```bash
# ✅ Good: Unique, consistent keys
X-Idempotency-Key: user-123-order-456
X-Idempotency-Key: invoice-2024-03-01-78910

# ❌ Bad: Generic, reused keys
X-Idempotency-Key: email         # Will collide
X-Idempotency-Key: test          # Reused for multiple requests

# Generate unique key (bash):
IDEMPOTENCY_KEY="order-$(date +%s)-$RANDOM"
curl -X POST ... -H "X-Idempotency-Key: $IDEMPOTENCY_KEY" ...
```

## Error Handling & Retry Strategy

BullMQ includes intelligent error handling with specialized retry strategies:

### Error Types

1. **Permanent Errors** (no retry): Invalid data, missing required fields
   - Example: Invalid email format → Fails immediately
   - Logged: "Permanent error - job will not be retried"

2. **Temporary Errors** (retry): Network issues, server timeouts
   - Example: Redis connection lost → Retries with exponential backoff (2s, 4s, 8s)
   - Logged: "Temporary error - will retry with exponential backoff"

3. **Rate Limited** (retry with delay): API rate limit exceeded
   - Example: Email provider returns 429 Too Many Requests
   - Retries with longer delay (60+ seconds)
   - Logged: "Rate limited - will retry with custom delay"

4. **Configuration Errors** (no retry): Missing API keys, bad config
   - Example: SendGrid API key not configured
   - Fails immediately
   - Logged: "Configuration error - job will not be retried"

### Monitoring Failed Jobs

```bash
# Check queue status (see failed count)
curl http://localhost:3000/stats

# In response, look for:
{
  "send-email": {
    "waiting": 0,
    "active": 0,
    "completed": 15,
    "failed": 2,      # ← 2 jobs failed after all retries
    "delayed": 0
  }
}

# Check specific job details
curl http://localhost:3000/jobs/{jobId}

# Shows:
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "state": "failed",
  "failedReason": "Invalid email format: not-an-email",
  "attempts": 3       # ← Tried 3 times
}
```

### Configuration

Retry behavior is configured in `src/queues/index.ts`:
- `attempts: 3` - Maximum 3 retry attempts
- `backoff: { type: 'exponential', delay: 2000 }` - Wait 2s, 4s, 8s between retries

## Architecture Overview

```
┌─────────────┐
│   Client    │ Submits job via HTTP
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Express Server     │ Validates & queues job
│  (Port 3000)        │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Redis Queue        │ Stores pending jobs
│  (Port 6379)        │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Workers            │ Process jobs concurrently
│  (Multiple threads) │
└─────────────────────┘
```

### Data Flow

1. **Job Submission**: Client POSTs to `/jobs/...` endpoint
2. **Validation**: Joi validates payload against schema
3. **Queuing**: Job added to Redis with metadata
4. **Worker Pickup**: Available worker pulls from queue
5. **Processing**: Worker executes job function
6. **Progress**: Job reports progress (0-100%)
7. **Completion**: Result stored, job marked complete
8. **Cleanup**: Job removed after 1 hour (configurable)

## Project Structure

```
src/
├── api/              # Express routes and middleware
├── config/           # Application configuration
├── jobs/             # Job types and validation
├── queues/           # Queue and worker management
├── workers/          # Job processing functions
├── logger/           # Structured logging
├── utils/            # Helper functions
├── tools/            # Standalone utilities
├── __tests__/        # Test files
└── index.js          # Application entry point
```

**Key Files:**

- `src/index.js` - Entry point, sets up Express and workers
- `src/api/routes.js` - HTTP endpoints for job submission
- `src/queues/index.js` - Queue lifecycle management
- `src/jobs/types.js` - Job type definitions
- `src/jobs/schemas.js` - Input validation schemas
- `src/workers/` - Job processors (emailWorker.js, dataWorker.js)

## Core Concepts

### Jobs
A job is a unit of work to be performed asynchronously.

```javascript
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "send-email",
  data: {
    email: "user@example.com",
    subject: "Hello",
    body: "Message body"
  },
  state: "completed",
  progress: 100,
  result: { success: true, messageId: "msg_123" }
}
```

### Queues
A queue stores jobs waiting to be processed.

```javascript
const queue = getQueue('send-email');
const job = await queue.add('send-email', data);
```

### Workers
A worker continuously pulls jobs from a queue and processes them.

```javascript
export const emailProcessor = async (job) => {
  const { email, subject, body } = job.data;

  job.progress(50);  // Report progress

  // Do work...

  return { success: true };
};
```

### Observability
Track job execution in real-time:

```bash
# Monitor all queues
npm run queue:monitor

# Check job status via API
curl http://localhost:3000/jobs/{jobId}

# View statistics
curl http://localhost:3000/stats
```

## Development Commands

```bash
# Start dev server (auto-reload)
npm run dev

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run single test
npm run test:single -- __tests__/api.test.js

# Monitor queues in real-time
npm run queue:monitor

# Start production server
npm start

# Lint code
npm run lint
```

## Configuration

Edit `.env` to configure:

```bash
# Redis connection
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=3000
NODE_ENV=development

# Logging
LOG_LEVEL=info

# Job processing
CONCURRENCY=5          # Jobs per worker
JOB_TIMEOUT=300000     # 5 minutes
```

## Adding New Job Types

### 1. Define Job Type

Edit `src/jobs/types.js`:
```javascript
export const JOB_TYPES = {
  SEND_EMAIL: 'send-email',
  PROCESS_DATA: 'process-data',
  GENERATE_REPORT: 'generate-report',  // NEW
};
```

### 2. Add Validation Schema

Edit `src/jobs/schemas.js`:
```javascript
[JOB_TYPES.GENERATE_REPORT]: Joi.object({
  reportType: Joi.string().required(),
  userId: Joi.string().uuid().required(),
  filters: Joi.object().optional(),
}),
```

### 3. Create Worker

Create `src/workers/reportWorker.js`:
```javascript
export const reportProcessor = async (job) => {
  job.progress(25);

  // Generate report...

  job.progress(100);
  return { success: true, reportUrl: '...' };
};
```

### 4. Register Worker

Edit `src/index.js`:
```javascript
registerWorker(JOB_TYPES.GENERATE_REPORT, reportProcessor);
```

### 5. Add API Route

Edit `src/api/routes.js`:
```javascript
router.post('/jobs/generate-report', async (req, res) => {
  try {
    const validatedData = validateJobPayload(JOB_TYPES.GENERATE_REPORT, req.body);
    const queue = getQueue(JOB_TYPES.GENERATE_REPORT);
    const job = await queue.add(JOB_TYPES.GENERATE_REPORT, validatedData);

    res.status(202).json({ success: true, jobId: job.id });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
```

### 6. Add Tests

Create tests in `src/__tests__/`:
```javascript
it('should generate report', async () => {
  const response = await request(app)
    .post('/jobs/generate-report')
    .send({ reportType: 'sales', userId: '...' });

  expect(response.status).toBe(202);
  expect(response.body.jobId).toBeDefined();
});
```

## Testing

```bash
# Run all tests with coverage
npm test -- --coverage

# Run specific test file
npm run test:single -- __tests__/api.test.js

# Watch mode (re-run on changes)
npm run test:watch
```

Tests validate:
- API endpoint behavior
- Job payload validation
- Worker error handling
- Queue operations

## Troubleshooting

### Redis Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

Solution: Start Redis:
```bash
redis-server
```

Or check `.env` has correct Redis host/port.

### Job Not Processing
1. Check logs: `npm run dev` shows logs
2. Monitor: `npm run queue:monitor` shows job state
3. Check worker: Ensure worker is registered in `src/index.js`

### High Memory Usage
1. Reduce `CONCURRENCY` in `.env`
2. Reduce job timeout if jobs hang
3. Check for memory leaks in worker code

### Tests Failing
1. Ensure Redis is running
2. Check `.env` test configuration
3. Run `npm test` to see full error

## Production Deployment

### Before Going Live

1. **Redis**: Use managed Redis (AWS ElastiCache, Redis Cloud)
2. **Node.js**: Use Node.js ≥18 in production
3. **Environment**: Set `NODE_ENV=production`
4. **Secrets**: Use environment variables, never commit `.env`
5. **Monitoring**: Integrate with error tracking (Sentry, DataDog)
6. **Logging**: Ensure logs are persisted (not in-memory)

### Scaling

Run multiple instances against same Redis:
```bash
# Instance 1
npm start

# Instance 2
npm start

# Instance 3 (another server)
npm start
```

All instances share the same job queue automatically.

## Best Practices

1. ✅ **Validate input** - Always use Joi schemas
2. ✅ **Log with context** - Include jobId, userId, etc.
3. ✅ **Handle errors** - Jobs should fail loudly
4. ✅ **Report progress** - Call `job.progress(percent)`
5. ✅ **Retry failed jobs** - BullMQ retries automatically
6. ✅ **Test thoroughly** - Test happy path + errors
7. ✅ **Monitor queues** - Use stats endpoint and queue monitor
8. ✅ **Graceful shutdown** - Jobs complete before shutdown

## Resources

- **BullMQ Docs**: https://docs.bullmq.io/
- **Redis Docs**: https://redis.io/docs/
- **Express Docs**: https://expressjs.com/
- **Joi Validation**: https://joi.dev/

## License

MIT

## Next Steps

1. **Explore**: Run `npm run dev` and test the API
2. **Monitor**: Open another terminal and run `npm run queue:monitor`
3. **Add Jobs**: Follow "Adding New Job Types" section
4. **Test**: Write tests for your job processors
5. **Deploy**: Follow "Production Deployment" section

Happy queuing! 🚀
