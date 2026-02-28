# Learning Path: BullMQ Mastery

A structured guide to learn BullMQ and this project from beginner to advanced.

## Phase 1: Basics (30 mins)

### 1.1 Understand What Jobs Queues Are
Read: `README.md` - "What is BullMQ?"

Key Concepts:
- Jobs = units of work
- Queues = job containers
- Workers = job processors
- Why? = asynchronous processing, error handling, retries

### 1.2 Read the Architecture Overview
Read: `README.md` - "Architecture Overview"

Understanding:
- Client submits job → HTTP POST
- Express validates and adds to Redis queue
- Worker picks up job
- Progress reported
- Result stored

### 1.3 Start the Project
```bash
# Terminal 1
npm install
npm run dev

# Terminal 2
npm run queue:monitor

# Terminal 3 (test)
curl http://localhost:3000/health
```

## Phase 2: Using the API (45 mins)

### 2.1 Submit Your First Job

```bash
# Submit email job
curl -X POST http://localhost:3000/jobs/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your.email@example.com",
    "subject": "Hello!",
    "body": "This is a test"
  }'

# Response: { "jobId": "abc123", "status": "queued" }
```

### 2.2 Check Job Status

```bash
# Replace abc123 with your jobId
curl http://localhost:3000/jobs/abc123

# You'll see:
# state: "active" / "completed" / "failed"
# progress: 0-100
# result: data when complete
```

### 2.3 Watch Queue Monitor
Look at terminal running `npm run queue:monitor` and see:
- Waiting: jobs waiting to be processed
- Active: jobs being processed
- Completed: finished jobs
- Failed: jobs that failed

### 2.4 Try Data Processing Job

```bash
curl -X POST http://localhost:3000/jobs/process-data \
  -H "Content-Type: application/json" \
  -d '{
    "dataId": "550e8400-e29b-41d4-a716-446655440000",
    "processType": "type1"
  }'
```

### 2.5 Get Queue Statistics

```bash
curl http://localhost:3000/stats

# See total jobs across all queues
```

**Exercises:**
- Submit 5 email jobs in a row
- Watch monitor show 5 waiting → 1 active → complete
- Poll same job 10 times and see progress increase
- Submit data processing job and monitor

## Phase 3: Understanding Code (1-2 hours)

### 3.1 Read Main Entry Point
Open: `src/index.js`

Understand:
- Express app setup
- Worker initialization
- Graceful shutdown

### 3.2 Explore API Routes
Open: `src/api/routes.js`

Understand:
- How routes work
- Job submission flow
- Status checking
- Stats endpoint

### 3.3 Look at Job Definitions
Open: `src/jobs/types.js` and `src/jobs/schemas.js`

Understand:
- Job type constants
- Joi validation schemas
- Why validation matters

### 3.4 Study Queue Management
Open: `src/queues/index.js`

Understand:
- `getQueue()`: Create or retrieve queue
- `registerWorker()`: Register job processor
- Event listeners (completed, failed)
- Graceful shutdown

### 3.5 Read a Worker
Open: `src/workers/emailWorker.js`

Understand:
- Job processor function
- Progress tracking: `job.progress(percent)`
- Error handling with try/catch
- Logging with context

**Exercises:**
- Trace path from API → Queue → Worker
- Understand validation flow
- Read error handling in worker

## Phase 4: Running Tests (30 mins)

### 4.1 Run All Tests
```bash
npm test

# Output: PASS __tests__/api.test.js, __tests__/jobs.test.js
```

### 4.2 Run Tests in Watch Mode
```bash
npm test -- --watch

# Change a test and watch it auto-run
```

### 4.3 Read Test Files
Open: `src/__tests__/api.test.js` and `src/__tests__/jobs.test.js`

Understand:
- API testing with Supertest
- Validation testing
- Happy path + error cases

### 4.4 Write Your First Test
Add to `src/__tests__/api.test.js`:
```javascript
it('should reject missing email', async () => {
  const response = await request(app)
    .post('/jobs/send-email')
    .send({
      subject: 'Test',
      body: 'Test'
      // missing email
    });

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});
```

Run: `npm test -- --watch` and see your test pass

**Exercises:**
- Run all tests
- Modify a test and see it fail
- Write a new test case
- Run coverage: `npm test -- --coverage`

## Phase 5: Add New Job Type (1-2 hours)

### 5.1 Plan Your Job Type
Example: "Generate Report" job that:
- Takes reportType, userId, filters
- Takes 2-5 seconds to process
- Returns report data

### 5.2 Follow "Adding New Job Types" Pattern
Read: `CLAUDE.md` → "Adding New Job Types"

Steps:
1. Add type to `src/jobs/types.js`
2. Add schema to `src/jobs/schemas.js`
3. Create worker: `src/workers/reportWorker.js`
4. Register in `src/index.js`
5. Add route in `src/api/routes.js`
6. Add tests in `src/__tests__/api.test.js`

### 5.3 Implement It
```javascript
// 1. src/jobs/types.js
export const JOB_TYPES = {
  SEND_EMAIL: 'send-email',
  PROCESS_DATA: 'process-data',
  GENERATE_REPORT: 'generate-report',  // NEW
};
```

```javascript
// 2. src/jobs/schemas.js
[JOB_TYPES.GENERATE_REPORT]: Joi.object({
  reportType: Joi.string().valid('sales', 'users', 'revenue').required(),
  userId: Joi.string().uuid().required(),
  filters: Joi.object().optional(),
}),
```

```javascript
// 3. src/workers/reportWorker.js
export const reportProcessor = async (job) => {
  const { reportType, userId } = job.data;

  job.progress(25);
  // Generate report
  job.progress(75);
  // Save to database
  job.progress(100);

  return { success: true, reportId: 'report_123' };
};
```

```javascript
// 4. src/index.js
registerWorker(JOB_TYPES.GENERATE_REPORT, reportProcessor);
```

```javascript
// 5. src/api/routes.js
router.post('/jobs/generate-report', async (req, res) => {
  // Implement like send-email endpoint
});
```

```javascript
// 6. src/__tests__/api.test.js
it('should accept valid report request', async () => {
  const response = await request(app)
    .post('/jobs/generate-report')
    .send({
      reportType: 'sales',
      userId: '550e8400-e29b-41d4-a716-446655440000'
    });

  expect(response.status).toBe(202);
  expect(response.body.jobId).toBeDefined();
});
```

### 5.4 Test It
```bash
# Start server
npm run dev

# In another terminal, test
curl -X POST http://localhost:3000/jobs/generate-report \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "sales",
    "userId": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Monitor in queue:monitor
npm run queue:monitor

# Run tests
npm test
```

**Milestone:** You've added a complete job type! ✅

## Phase 6: Advanced Patterns (2-3 hours)

### 6.1 Scheduled Jobs
Read: `EXAMPLES.md` → "Example 8: Delayed Job Execution"

Learn:
- Schedule jobs for specific time
- Use `delay` option
- Practical: send emails at specific hour

### 6.2 Priority Jobs
Read: `EXAMPLES.md` → "Example 6: Job Priorities"

Learn:
- High/normal/low priority
- VIP users get faster processing
- Use `priority` option

### 6.3 Real-time Progress
Read: `EXAMPLES.md` → "Example 4: Real-time Progress Updates"

Learn:
- Server-Sent Events (SSE)
- WebSockets alternative
- Real-time UI updates

### 6.4 Error Handling
Read: `EXAMPLES.md` → "Example 7: Error Handling and Recovery"

Learn:
- Retryable vs non-retryable errors
- Exponential backoff strategy
- Error logging and alerting

### 6.5 Bulk Operations
Read: `EXAMPLES.md` → "Example 3: Bulk Job Submission"

Learn:
- Submit 1000s of jobs efficiently
- Parallel API calls
- Handling responses

**Exercises:**
- Add delayed job endpoint
- Add priority job endpoint
- Implement SSE for real-time updates
- Add custom error handling

## Phase 7: Deployment (1-2 hours)

### 7.1 Understand Production Considerations
Read: `README.md` → "Production Deployment"

Learn:
- Use managed Redis (not local)
- Node.js best practices
- Environment variables
- Error tracking

### 7.2 Set Up Docker (Optional)
Read: `SETUP.md` → "Docker Quick Start"

Learn:
- Containerize application
- Docker Compose
- Environment in containers

### 7.3 Configuration for Production
```bash
# Update .env for production
NODE_ENV=production
REDIS_HOST=your-redis-url.com
REDIS_PASSWORD=secure-password
LOG_LEVEL=warn
CONCURRENCY=10
```

### 7.4 Horizontal Scaling
Learn:
- Run multiple instances
- All share same Redis queue
- Load balancer in front

**Exercises:**
- Create production .env
- Test with Redis Cloud
- Run 2 instances locally and see shared queue

## Phase 8: Monitoring & Observability (1 hour)

### 8.1 Structured Logging
Open: `src/logger/index.js`

Learn:
- Pino logger configuration
- Structured logs (JSON)
- Context in logs

### 8.2 Queue Statistics
```bash
curl http://localhost:3000/stats

# See real-time queue health
```

### 8.3 Job Status Tracking
```bash
curl http://localhost:3000/jobs/{jobId}

# See detailed job info
```

### 8.4 Monitor Tool
```bash
npm run queue:monitor

# Real-time dashboard
```

**Exercises:**
- Submit 100 jobs, watch monitor
- Check logs at different LOG_LEVEL
- Get stats every second for metrics

## Phase 9: Real-World Integration (2-3 hours)

### 9.1 Email Service Integration
Replace simulated email in `emailWorker.js`:
```javascript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

export const emailProcessor = async (job) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: job.data.email,
    subject: job.data.subject,
    text: job.data.body
  });
};
```

### 9.2 Database Integration
Add job results to database:
```javascript
import db from './database.js';

export const processor = async (job) => {
  const result = doWork(job.data);
  await db.saveResult(job.id, result);
  return result;
};
```

### 9.3 Webhook Notifications
Notify external systems when job completes:
```javascript
worker.on('completed', async (job) => {
  await fetch('https://your-app.com/webhooks/job-complete', {
    method: 'POST',
    body: JSON.stringify({ jobId: job.id, result: job.returnvalue })
  });
});
```

### 9.4 Monitoring Integration
Connect to Sentry/DataDog:
```javascript
import Sentry from '@sentry/node';

worker.on('failed', (job, err) => {
  Sentry.captureException(err, { extra: { jobId: job.id } });
});
```

**Milestone:** Production-ready system! 🚀

## Learning Resources

**Official Docs:**
- BullMQ: https://docs.bullmq.io/
- Redis: https://redis.io/docs/
- Express: https://expressjs.com/

**In This Project:**
- `README.md` - Overview and API
- `EXAMPLES.md` - Code examples
- `CLAUDE.md` - Architecture
- `SETUP.md` - Installation
- `src/__tests__/` - Test examples

**Optional Learning:**
- BullMQ GitHub: https://github.com/taskforcesh/bullmq
- Queue patterns: https://www.rabbitmq.com/tutorials/tutorial-one-python.html

## Time Estimate

| Phase | Time | Topic |
|-------|------|-------|
| 1 | 30m | Basics & Setup |
| 2 | 45m | Using the API |
| 3 | 2h | Understanding Code |
| 4 | 30m | Testing |
| 5 | 2h | Add New Job Type |
| 6 | 3h | Advanced Patterns |
| 7 | 2h | Deployment |
| 8 | 1h | Monitoring |
| 9 | 3h | Real-World Integration |
| **Total** | **~15 hours** | **Full Mastery** |

## Checkpoint Questions

After each phase, ask yourself:

**Phase 2:** Can you submit and track a job?
**Phase 3:** Can you trace code from request to response?
**Phase 4:** Can you write and run tests?
**Phase 5:** Can you add a complete job type?
**Phase 6:** Can you implement priority or scheduled jobs?
**Phase 7:** Can you deploy to production?
**Phase 8:** Can you interpret logs and statistics?
**Phase 9:** Can you integrate with external services?

## Next Steps

1. Start with **Phase 1**: Follow setup
2. Complete **Phase 2**: Submit real jobs
3. Read through **Phase 3**: Understand architecture
4. Implement **Phase 5**: Add your own job type
5. Then go deeper into phases that interest you

Good luck! 🚀
