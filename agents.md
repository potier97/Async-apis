# agents.md

Guidelines for Claude Code agents working on this BullMQ project.

## Code Organization Principles

### When Modifying Existing Code
- Understand the full context before making changes
- Preserve existing patterns (configuration, logging, validation)
- Keep changes minimal and focused
- Update tests when changing behavior
- Avoid refactoring unrelated code

### File Ownership

| Directory | Pattern | Guidelines |
|-----------|---------|------------|
| `src/config/` | Configuration | Changes require validation logic updates |
| `src/jobs/` | Job definitions | Add schema + type when creating new jobs |
| `src/queues/` | Queue lifecycle | Critical code - test thoroughly |
| `src/workers/` | Job processors | Each worker should be independent |
| `src/api/` | HTTP interface | Maintain backward compatibility |
| `src/logger/` | Logging | Use existing logger, don't create new ones |
| `src/__tests__/` | Tests | Keep tests in `__tests__` directories |

## Adding Features

### New Job Type Workflow
1. Add type constant to `src/jobs/types.js`
2. Add validation schema to `src/jobs/schemas.js`
3. Create worker in `src/workers/newWorker.js` with error handling
4. Register in `src/index.js`
5. Add API route in `src/api/routes.js`
6. Add tests in `src/__tests__/`
7. Update CLAUDE.md if pattern changes

### New API Endpoint Workflow
1. Define route in `src/api/routes.js`
2. Validate input using existing Joi schemas
3. Use structured logging with context
4. Return consistent JSON response format
5. Handle errors with 4xx/5xx status codes
6. Add test in `src/__tests__/api.test.js`

### Adding Dependencies
- Discuss with user before adding large packages
- Prefer packages that are actively maintained
- Consider production size impact
- Update package.json and .env.example

## Code Standards

### Logging
```javascript
// GOOD - Structured with context
logger.info({ jobId, email }, 'Email sent successfully');

// BAD - No context
logger.info('Email sent');
```

### Error Handling
```javascript
// GOOD - Catch, log, and rethrow/respond
try {
  // work
} catch (error) {
  logger.error({ error: error.message }, 'Context');
  throw error;
}

// BAD - Silent failures
try {
  // work
} catch (error) {
  // ignore
}
```

### Job Processing
```javascript
// GOOD - Report progress and handle errors
export const processor = async (job) => {
  try {
    job.progress(25);
    // work
    job.progress(75);
    return result;
  } catch (error) {
    logger.error({ jobId: job.id, error }, 'Failed');
    throw error;
  }
};
```

### Configuration
```javascript
// GOOD - Use config object
const port = config.port;
const redis = config.redis;

// BAD - Read env directly
const port = process.env.PORT;
```

## Testing Standards

### Test Naming
- Describe what the test validates, not implementation
- Use "should" for test descriptions
- Group related tests in describe blocks

### Test Structure
```javascript
describe('Feature Name', () => {
  it('should return expected result for valid input', () => {
    // arrange
    const input = { ... };

    // act
    const result = doSomething(input);

    // assert
    expect(result).toBe(expected);
  });
});
```

### Coverage
- Maintain >50% coverage on src/
- Test happy path and error cases
- Mock external dependencies (Redis, email service)

## Performance Considerations

- **Job Timeout**: Default 5min (300000ms), adjust if needed
- **Concurrency**: Default 5 jobs/worker, tune based on CPU/memory
- **Cleanup**: Jobs removed after 1 hour, adjust `removeOnComplete.age`
- **Retry**: 3 attempts with exponential backoff, don't increase without reason

## Security Notes

- Never log sensitive data (passwords, tokens, API keys)
- Validate all user input with Joi
- Use environment variables for secrets (not in code)
- Sanitize job data before logging

## Debugging Workflow

1. **Reproduce**: Run `npm run dev` and trigger the issue
2. **Check Logs**: Look for structured error logs with context
3. **Monitor**: `npm run queue:monitor` shows job states
4. **Inspect**: Use `/jobs/:jobId` endpoint to see full job state
5. **Test**: Add test case to prevent regression

## Common Pitfalls

1. **Not logging errors**: Always log caught errors with context
2. **Silent failures**: Jobs should fail loudly (throw errors)
3. **Hardcoded values**: Use config constants instead
4. **Ignoring job progress**: Workers should report progress
5. **No validation**: Always validate job input with schemas
6. **Forgetting tests**: Update tests when modifying behavior

## Git Workflow

- Create meaningful commits (clear messages)
- Reference issues/PRs in commit messages
- Keep commits focused on single feature/fix
- Don't commit environment variables (.env)
- Run tests before committing

## Documentation

- Update CLAUDE.md if architecture changes
- Add JSDoc comments for exported functions
- Keep README.md in sync with commands
- Document new job types in CLAUDE.md "Adding New Job Types" section
