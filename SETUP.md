# Setup Instructions

Complete guide to set up the BullMQ project on your local machine.

## System Requirements

- **Node.js** ≥18.0.0
- **npm** ≥8.0.0
- **Redis** ≥6.0.0 (or use Docker)

## Step 1: Install Node.js

### macOS (using Homebrew)
```bash
brew install node
node --version  # Verify installation
```

### Windows (using Chocolatey)
```bash
choco install nodejs
node --version  # Verify installation
```

### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Verify installation
```

## Step 2: Install Redis

### Option A: Local Installation (Recommended for Development)

#### macOS (using Homebrew)
```bash
brew install redis
brew services start redis
redis-cli ping  # Should return "PONG"
```

#### Windows (using Windows Subsystem for Linux - WSL2)
```bash
# Inside WSL2 terminal
sudo apt-get update
sudo apt-get install redis-server
redis-server  # Start Redis
# In another terminal: redis-cli ping
```

#### Windows (using Docker - Easiest)
```bash
# Install Docker Desktop from https://www.docker.com/products/docker-desktop
# Then run:
docker run -d -p 6379:6379 redis:latest
docker ps  # Should show running redis container
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo service redis-server start
redis-cli ping  # Should return "PONG"
```

### Option B: Cloud Redis (Recommended for Production)

- **Redis Cloud**: https://redis.com/try-free/
- **AWS ElastiCache**: https://aws.amazon.com/elasticache/
- **UpStash**: https://upstash.com/

## Step 3: Clone/Download Project

```bash
cd ~/Documents
git clone <your-repo-url> bullmq
cd bullmq
```

## Step 4: Install Dependencies

```bash
npm install
```

This installs all required packages:
- **bullmq**: Job queue library
- **express**: Web framework
- **redis**: Redis client
- **pino**: Logger
- **joi**: Validation
- **nodemon**: Development auto-reload
- **jest**: Testing framework
- **supertest**: HTTP testing

## Step 5: Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Default `.env` works for local development. Edit if needed:
```bash
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
```

If using cloud Redis, update:
```bash
REDIS_HOST=your-cloud-redis-host.com
REDIS_PORT=6379  # or your port
# Add password if required (update src/config/redis.js)
```

## Step 6: Start Development

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Monitor queues (new terminal)
npm run queue:monitor

# Terminal 3: Run tests (optional)
npm test
```

You should see:
```
✓ Server started successfully on http://localhost:3000
✓ Workers initialized
✓ Queue monitor showing job statistics
```

## Step 7: Test the Installation

```bash
# Health check
curl http://localhost:3000/health

# Submit test job
curl -X POST http://localhost:3000/jobs/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "subject": "Test",
    "body": "Hello World"
  }'

# Check job status (replace with actual jobId)
curl http://localhost:3000/jobs/YOUR_JOB_ID
```

## Troubleshooting

### "Redis connection refused"
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution**: Start Redis
```bash
# If using Homebrew
brew services start redis

# If using Docker
docker run -d -p 6379:6379 redis:latest

# If using WSL2
redis-server
```

### "Cannot find module 'bullmq'"
```bash
# Solution: Install dependencies
npm install
```

### "Port 3000 already in use"
```bash
# Solution: Use different port
PORT=3001 npm run dev

# Or kill the process using port 3000
# macOS/Linux:
lsof -i :3000
kill -9 <PID>

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### "Cannot find Redis on Windows"
```bash
# Use Docker instead (easiest)
docker run -d -p 6379:6379 redis:latest

# Or use WSL2
wsl --install
# Follow WSL2 instructions above
```

## Next Steps

1. ✅ Verify server is running: `curl http://localhost:3000/health`
2. ✅ Open `README.md` to learn the API
3. ✅ Check `EXAMPLES.md` for usage examples
4. ✅ Review `CLAUDE.md` for architecture details
5. ✅ Run `npm test` to verify tests pass
6. ✅ Read `src/workers/emailWorker.js` to understand how workers work
7. ✅ Try submitting a job and monitoring its progress

## Common Commands Cheat Sheet

```bash
# Development
npm run dev              # Start development server
npm run dev --verbose   # With more logging
npm run queue:monitor   # Monitor jobs in real-time
npm run lint            # Check code style
npm run lint --fix      # Auto-fix code style

# Testing
npm test                # Run all tests
npm test -- --watch     # Watch mode
npm test -- --coverage  # With coverage report
npm run test:single test/api.test.js  # Single test

# Production
npm start               # Start production server
NODE_ENV=production npm start  # Explicit production mode
```

## Docker Quick Start

If you want everything in Docker:

```bash
# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      REDIS_HOST: redis
      NODE_ENV: development
    depends_on:
      - redis
    volumes:
      - .:/app
      - /app/node_modules

volumes:
  redis_data:
EOF

# Build and run
docker-compose up
```

## IDE Setup

### VS Code Extensions (Recommended)
- ESLint
- Prettier
- Thunder Client (for API testing)
- Node.js Extension Pack

### WebStorm
- Built-in Node.js support
- Built-in Redis client viewer

## Getting Help

- Check `README.md` for API documentation
- See `EXAMPLES.md` for code examples
- Read `CLAUDE.md` for architecture details
- Run `npm test` to verify setup
- Check logs: Set `LOG_LEVEL=debug` in `.env`

## Verification Checklist

- [ ] Node.js ≥18 installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Redis running (`redis-cli ping`)
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file exists in project root
- [ ] Server starts (`npm run dev`)
- [ ] Health check works (`curl http://localhost:3000/health`)
- [ ] Monitor shows queues (`npm run queue:monitor`)
- [ ] Tests pass (`npm test`)

✅ If all checks pass, you're ready to develop!
