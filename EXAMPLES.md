# BullMQ Examples

Practical examples of using BullMQ in common scenarios.

## Example 1: Submit Email Job via Client

### Using cURL

```bash
curl -X POST http://localhost:3000/jobs/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "subject": "Welcome!",
    "body": "Thanks for signing up."
  }'
```

### Using JavaScript/Node.js

```javascript
import fetch from 'node-fetch';

async function submitEmailJob() {
  const response = await fetch('http://localhost:3000/jobs/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user@example.com',
      subject: 'Welcome!',
      body: 'Thanks for signing up.'
    })
  });

  const data = await response.json();
  console.log('Job ID:', data.jobId);

  return data.jobId;
}

submitEmailJob();
```

### Using Python

```python
import requests
import json

response = requests.post(
    'http://localhost:3000/jobs/send-email',
    json={
        'email': 'user@example.com',
        'subject': 'Welcome!',
        'body': 'Thanks for signing up.'
    }
)

data = response.json()
print(f"Job ID: {data['jobId']}")
```

## Example 2: Monitor Job Progress

### Poll Job Status

```javascript
async function checkJobStatus(jobId, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`http://localhost:3000/jobs/${jobId}`);
    const job = await response.json();

    console.log(`Job ${jobId}: ${job.state} (${job.progress}%)`);

    if (job.state === 'completed') {
      console.log('Job completed:', job.result);
      return job.result;
    }

    if (job.state === 'failed') {
      console.error('Job failed:', job.failedReason);
      throw new Error(job.failedReason);
    }

    // Wait 1 second before checking again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error('Job did not complete in time');
}

const jobId = await submitEmailJob();
const result = await checkJobStatus(jobId);
```

## Example 3: Bulk Job Submission

### Submit Multiple Jobs

```javascript
async function submitBulkEmails(emails) {
  const jobIds = [];

  for (const email of emails) {
    const response = await fetch('http://localhost:3000/jobs/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        subject: 'Newsletter',
        body: 'Check out our latest updates...'
      })
    });

    const data = await response.json();
    jobIds.push(data.jobId);
  }

  return jobIds;
}

const emails = [
  'user1@example.com',
  'user2@example.com',
  'user3@example.com'
];

const jobIds = await submitBulkEmails(emails);
console.log('Submitted jobs:', jobIds);
```

## Example 4: Real-time Progress Updates

### Server-Sent Events (SSE)

```javascript
// Add to src/api/routes.js
router.get('/jobs/:jobId/stream', async (req, res) => {
  const { jobId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const pollInterval = setInterval(async () => {
    try {
      // Find job in all queues
      let job = null;
      for (const jobType of Object.values(JOB_TYPES)) {
        const queue = getQueue(jobType);
        job = await queue.getJob(jobId);
        if (job) break;
      }

      if (!job) {
        res.write('data: {"error": "Job not found"}\n\n');
        clearInterval(pollInterval);
        res.end();
        return;
      }

      const state = await job.getState();
      const progress = job.progress();

      res.write(`data: ${JSON.stringify({ state, progress })}\n\n`);

      if (state === 'completed' || state === 'failed') {
        clearInterval(pollInterval);
        res.end();
      }
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      clearInterval(pollInterval);
      res.end();
    }
  }, 500);
});
```

### Client-side SSE

```html
<script>
function watchJobProgress(jobId) {
  const eventSource = new EventSource(`/jobs/${jobId}/stream`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log(`Progress: ${data.progress}%`);

    if (data.state === 'completed') {
      console.log('Job completed!');
      eventSource.close();
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
  };
}

watchJobProgress('job-id-here');
</script>
```

## Example 5: Retry Logic

### Custom Retry with Exponential Backoff

```javascript
// In src/jobs/schemas.js - Already configured by default
// But you can customize per job type

export const jobSchemas = {
  [JOB_TYPES.SEND_EMAIL]: Joi.object({ /* ... */ }),
};

// In src/api/routes.js - Customize retry strategy per job
const job = await queue.add(
  JOB_TYPES.SEND_EMAIL,
  validatedData,
  {
    jobId: uuidv4(),
    attempts: 5,  // Retry up to 5 times
    backoff: {
      type: 'exponential',
      delay: 2000,  // Start with 2 seconds
    },
    removeOnComplete: {
      age: 3600,  // Remove after 1 hour
    },
  }
);
```

## Example 6: Job Priorities

### Submit High-Priority Job

```javascript
// Add to src/api/routes.js
router.post('/jobs/send-email/priority', async (req, res) => {
  try {
    const { email, subject, body, priority } = req.body;
    const validatedData = validateJobPayload(JOB_TYPES.SEND_EMAIL, {
      email, subject, body
    });

    const queue = getQueue(JOB_TYPES.SEND_EMAIL);
    const job = await queue.add(
      JOB_TYPES.SEND_EMAIL,
      validatedData,
      {
        jobId: uuidv4(),
        priority: priority || 1,  // 1 = high, 2 = normal, 3 = low
      }
    );

    res.status(202).json({
      success: true,
      jobId: job.id,
      priority: job.opts.priority
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
```

## Example 7: Error Handling and Recovery

### Worker with Detailed Error Handling

```javascript
export const robustProcessor = async (job) => {
  logger.info({ jobId: job.id }, 'Starting job');

  try {
    job.progress(0);

    // Step 1: Validate extended data
    if (!isValidData(job.data)) {
      throw new Error('Invalid job data');
    }
    job.progress(25);

    // Step 2: Fetch dependencies
    const dependencies = await fetchDependencies(job.data);
    job.progress(50);

    // Step 3: Process
    const result = await process(dependencies);
    job.progress(75);

    // Step 4: Save results
    await saveResults(result);
    job.progress(100);

    logger.info({ jobId: job.id, result }, 'Job completed');
    return result;

  } catch (error) {
    logger.error(
      { jobId: job.id, error: error.message, stack: error.stack },
      'Job processing failed'
    );

    // Determine if error is retryable
    if (isRetryableError(error)) {
      throw error;  // BullMQ will retry
    } else {
      // For non-retryable errors, store error state
      return { success: false, error: error.message };
    }
  }
};

function isRetryableError(error) {
  // Network errors are retryable
  if (error.code === 'ECONNREFUSED') return true;
  if (error.code === 'ETIMEDOUT') return true;

  // Validation errors are not retryable
  if (error instanceof ValidationError) return false;

  // Default: retry
  return true;
}
```

## Example 8: Delayed Job Execution

### Schedule Job for Later

```javascript
// In src/api/routes.js
router.post('/jobs/send-email/scheduled', async (req, res) => {
  try {
    const { email, subject, body, delayMs } = req.body;
    const validatedData = validateJobPayload(JOB_TYPES.SEND_EMAIL, {
      email, subject, body
    });

    const queue = getQueue(JOB_TYPES.SEND_EMAIL);
    const job = await queue.add(
      JOB_TYPES.SEND_EMAIL,
      validatedData,
      {
        jobId: uuidv4(),
        delay: delayMs || 3600000,  // Default: 1 hour
      }
    );

    const scheduleTime = new Date(Date.now() + job.opts.delay);
    res.status(202).json({
      success: true,
      jobId: job.id,
      scheduledFor: scheduleTime.toISOString()
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Usage: Schedule email for 1 hour from now
curl -X POST http://localhost:3000/jobs/send-email/scheduled \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "subject": "Reminder",
    "body": "This was scheduled for later",
    "delayMs": 3600000
  }'
```

## Example 9: Job Events and Hooks

### Listen to Job Events

```javascript
// In src/queues/index.js or workers
export const registerWorker = (queueName, processor) => {
  const worker = new Worker(queueName, processor, {
    connection: config.redis,
    concurrency: config.concurrency,
  });

  // Job events
  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Job completed');
    // Emit webhook, update database, etc.
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job.id, error: err.message }, 'Job failed');
    // Send alert, update status, etc.
  });

  worker.on('progress', (job, progress) => {
    logger.debug({ jobId: job.id, progress }, 'Progress updated');
  });

  worker.on('stalled', (jobId) => {
    logger.warn({ jobId }, 'Job stalled - will be retried');
  });

  return worker;
};
```

## Example 10: Queue Statistics and Dashboard

### Get Comprehensive Stats

```javascript
// In src/api/routes.js
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = {
      timestamp: new Date().toISOString(),
      queues: {},
      totals: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      }
    };

    for (const jobType of Object.values(JOB_TYPES)) {
      const queue = getQueue(jobType);
      const counts = await queue.getJobCounts();

      stats.queues[jobType] = counts;

      // Update totals
      Object.keys(counts).forEach(key => {
        stats.totals[key] = (stats.totals[key] || 0) + (counts[key] || 0);
      });
    }

    // Calculate processing rate (jobs/minute)
    const completedThisMinute = await getRecentCompletedCount(60000);
    stats.processingRate = completedThisMinute;

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## Testing Job Processors

### Unit Test Example

```javascript
// src/__tests__/workers.test.js
import { emailProcessor } from '../workers/emailWorker.js';

describe('Email Worker', () => {
  it('should process valid email', async () => {
    // Mock job object
    const mockJob = {
      id: 'test-job-1',
      data: {
        email: 'test@example.com',
        subject: 'Test',
        body: 'Test body'
      },
      progress: jest.fn(),
      log: jest.fn(),
    };

    const result = await emailProcessor(mockJob);

    expect(result.success).toBe(true);
    expect(result.email).toBe('test@example.com');
    expect(mockJob.progress).toHaveBeenCalledWith(100);
  });

  it('should reject invalid email', async () => {
    const mockJob = {
      id: 'test-job-2',
      data: {
        email: 'invalid-email',
        subject: 'Test',
        body: 'Test body'
      },
      progress: jest.fn(),
    };

    await expect(emailProcessor(mockJob)).rejects.toThrow();
  });
});
```

---

Use these examples as templates for your own job processors and API endpoints!
