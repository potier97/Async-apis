# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a professional BullMQ queue management system built with Express.js and Node.js. It demonstrates best practices for:
- Job queue management using BullMQ
- Observability and structured logging with Pino
- Input validation with Joi
- Error handling and graceful shutdown
- Testing with Jest
- Scalability and concurrency handling

## Architecture

### Core Components

1. **Queue Management** (`src/queues/index.js`)
   - Centralized queue and worker creation
   - Automatic retry logic with exponential backoff
   - Job cleanup after completion
   - Event listeners for observability

2. **Job Definitions** (`src/jobs/`)
   - `types.js`: Centralized job type definitions (SEND_EMAIL, PROCESS_DATA, GENERATE_REPORT)
   - `schemas.js`: Joi validation schemas for each job type
   - Ensures type safety across the application

3. **Workers** (`src/workers/`)
   - `emailWorker.js`: Processes email jobs with progress tracking
   - `dataWorker.js`: Processes data transformation jobs
   - Each worker includes error handling and logging
   - Jobs report progress (0-100) for observability

4. **API Routes** (`src/api/routes.js`)
   - POST `/jobs/send-email`: Submit email job
   - POST `/jobs/process-data`: Submit data processing job
   - GET `/jobs/:jobId`: Get job status and details
   - GET `/health`: Health check
   - GET `/stats`: Queue statistics across all job types

5. **Configuration** (`src/config/`)
   - `index.js`: Centralized app configuration
   - `redis.js`: Redis connection configuration
   - Environment validation on startup
   - Support for development, test, and production modes

6. **Logging** (`src/logger/index.js`)
   - Structured logging with Pino
   - Pretty-printed output in development
   - JSON format in production
   - Contextual information in all logs

### Data Flow

1. Client submits job via HTTP POST
2. Validation layer checks payload against Joi schemas
3. Job added to Redis queue with unique ID
4. Worker processes job from queue
5. Progress updates sent to Redis
6. Client polls `/jobs/:jobId` endpoint for status
7. Completed job stored in Redis, removed after 1 hour

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (auto-reload with nodemon)
npm run dev

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run single test file
npm run test:single -- __tests__/api.test.js

# Apply ESLint fixes
npm run lint

# Monitor queues in real-time
npm run queue:monitor

# Start production server
npm start
```

## Project Structure

```
bullmq/
├── src/
│   ├── api/              # Express routes and middleware
│   │   ├── routes.js     # API endpoint definitions
│   │   └── middleware.js # Request/error handling
│   ├── config/           # Configuration modules
│   │   ├── index.js      # Main config with validation
│   │   └── redis.js      # Redis connection config
│   ├── jobs/             # Job definitions and validation
│   │   ├── types.js      # Job type constants
│   │   └── schemas.js    # Joi validation schemas
│   ├── queues/           # Queue and worker management
│   │   └── index.js      # Queue/worker creation and lifecycle
│   ├── workers/          # Job processing functions
│   │   ├── emailWorker.js
│   │   └── dataWorker.js
│   ├── logger/           # Logging setup
│   │   └── index.js      # Pino logger configuration
│   ├── utils/            # Helper utilities
│   │   └── jobHelpers.js # Job-related utilities
│   ├── tools/            # Standalone tools
│   │   └── queueMonitor.js # Real-time queue monitoring
│   ├── __tests__/        # Test files
│   │   ├── api.test.js   # API route tests
│   │   └── jobs.test.js  # Job validation tests
│   ├── tests/
│   │   └── setup.js      # Jest configuration
│   └── index.js          # Application entry point
├── jest.config.js        # Jest test runner config
├── .env                  # Environment variables (local)
├── .env.example          # Environment template
├── .gitignore            # Git ignore rules
├── package.json          # Dependencies and scripts
├── CLAUDE.md            # This file
└── agents.md            # Agent guidelines
```

## Architecture & Patterns

**Read**: `ARCHITECTURE.md` for comprehensive patterns:
- Layered Architecture (API → Business → Queue → Data)
- Singleton pattern for resources
- Factory pattern for object creation
- Event-driven workers
- Graceful shutdown
- Exponential backoff retry strategy
- Observability across all layers

**For Implementation**: See `IMPLEMENTATION_GUIDE.md` for step-by-step examples of:
- Adding new job types
- Improving existing workers
- Creating custom middleware
- Building utility functions
- Adding monitoring endpoints

## Key Patterns & Best Practices

### 1. Centralized Configuration
- All config in `src/config/` loaded at startup
- Environment validation prevents silent failures
- Supports dev/test/prod environments via NODE_ENV

### 2. Structured Logging
- Use Pino for all logging (never `console.log`)
- Include context: `logger.info({ jobId, email }, 'message')`
- Automatically colored in dev, JSON in production

### 3. Job Validation
- All job payloads validated with Joi schemas
- Validation happens before job enters queue
- Clear error messages for API clients

### 4. Error Handling
- Workers catch and log errors
- Failed jobs automatically retry (3 attempts, exponential backoff)
- Graceful shutdown closes workers and queues

### 5. Progress Tracking
- Jobs call `job.progress(percentage)` during processing
- Clients can poll `/jobs/:jobId` to see progress
- Enables real-time UI updates

### 6. Queue Monitoring
- `npm run queue:monitor` shows live stats
- Displays waiting, active, completed, failed jobs
- Useful for debugging and observability

## Adding New Job Types

1. **Add to `src/jobs/types.js`:**
   ```javascript
   export const JOB_TYPES = {
     // ... existing
     MY_NEW_JOB: 'my-new-job',
   };
   ```

2. **Create validation schema in `src/jobs/schemas.js`:**
   ```javascript
   [JOB_TYPES.MY_NEW_JOB]: Joi.object({
     field1: Joi.string().required(),
     field2: Joi.number().required(),
   }),
   ```

3. **Create worker in `src/workers/myWorker.js`:**
   ```javascript
   export const myProcessor = async (job) => {
     job.progress(25);
     // Do work
     return result;
   };
   ```

4. **Register worker in `src/index.js`:**
   ```javascript
   registerWorker(JOB_TYPES.MY_NEW_JOB, myProcessor);
   ```

5. **Add API route in `src/api/routes.js`:**
   ```javascript
   router.post('/jobs/my-new-job', async (req, res) => {
     // Validate, add to queue, return response
   });
   ```

6. **Add tests in `src/__tests__/`**

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| NODE_ENV | development | Environment (development/test/production) |
| REDIS_HOST | localhost | Redis server host |
| REDIS_PORT | 6379 | Redis server port |
| REDIS_DB | 0 | Redis database number |
| PORT | 3000 | Express server port |
| LOG_LEVEL | info | Logging level (trace/debug/info/warn/error/fatal) |
| MAX_WORKERS | 4 | Maximum concurrent workers |
| CONCURRENCY | 5 | Jobs per worker to process simultaneously |
| JOB_TIMEOUT | 300000 | Max job duration in milliseconds (5 min) |

## Testing

- **Priority**: Tests are optional, focus on implementation first
- **Existing tests**: Use as reference examples, not mandatory to maintain
- **Run if needed**: `npm test` for validation
- **Test files**: Located in `src/__tests__/` as examples

**Note**: This project prioritizes rapid feature implementation over test coverage. Tests can be added incrementally as needed for critical paths.

## Production Considerations

1. **Redis Persistence**: Enable RDB/AOF in Redis config
2. **Job Retention**: Adjust `removeOnComplete.age` for your needs
3. **Retry Strategy**: Tune `attempts` and `backoff` for job types
4. **Monitoring**: Use queue stats endpoint to track health
5. **Scaling**: Run multiple instances with same Redis
6. **Error Tracking**: Integrate with Sentry/DataDog for production monitoring

## Common Tasks

### View real-time queue stats
```bash
npm run queue:monitor
```

### Check job status via API
```bash
curl http://localhost:3000/jobs/{jobId}
```

### Get queue statistics
```bash
curl http://localhost:3000/stats
```

### Run a single test
```bash
npm run test:single -- __tests__/api.test.js
```

### Debug a failing worker
1. Set `LOG_LEVEL=debug` in .env
2. Run `npm run dev`
3. Submit a job and watch logs

## Debugging Tips

- **Queue Monitor**: `npm run queue:monitor` shows live job counts
- **Logs**: Watch stderr for structured logs with context
- **Redis CLI**: Use `redis-cli` to inspect queues directly: `KEYS bullmq:*`
- **Job Details**: POST `/jobs/:jobId` returns full job object including errors
