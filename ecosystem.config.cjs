/**
 * PM2 Ecosystem Configuration
 * Professional process management and monitoring for BullMQ
 *
 * Commands:
 * - pm2 start ecosystem.config.cjs         # Start with PM2
 * - pm2 monit                              # Monitor in real-time
 * - pm2 logs                               # View all logs
 * - pm2 logs bullmq-app                    # View specific app logs
 * - pm2 dashboard                          # Web dashboard (localhost:9615)
 * - pm2 stop all                           # Stop all processes
 * - pm2 delete all                         # Remove all processes
 */

module.exports = {
  apps: [
    {
      // Application info
      name: 'bullmq-app',
      script: './dist/index.js',
      description: 'BullMQ Job Queue Application',

      // Environment
      env: {
        NODE_ENV: 'development',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        PORT: 3000,
        LOG_LEVEL: 'info',
      },

      env_production: {
        NODE_ENV: 'production',
        REDIS_HOST: 'redis',
        REDIS_PORT: 6379,
        PORT: 3000,
        LOG_LEVEL: 'warn',
      },

      // Clustering
      instances: 1, // Use CPU count for production
      exec_mode: 'cluster',

      // Restart policy
      max_memory_restart: '500M',
      max_restarts: 5,
      min_uptime: '10s',

      // Logging
      output: './logs/stdout.log',
      error: './logs/stderr.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,

      // Health check
      health_check: {
        endpoint: '/health',
        timeout: 5000,
        protocol: 'http',
      },

      // Watch & Reload
      watch: ['dist'],
      ignore_watch: [
        'node_modules',
        'logs',
        '.git',
        'dist/**/*.d.ts',
        'dist/**/*.map',
      ],

      // Graceful shutdown
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],

  // Monitoring & Alerts
  monitor_interval: 5000,
  log_file: './logs/pm2.log',

  // Version
  version: '1.0.0',
};
