/**
 * Application configuration
 * Centralized configuration for the entire application
 */

import 'dotenv/config';
import getRedisConfig from './redis.js';

interface AppConfig {
  env: string;
  isDevelopment: boolean;
  isProduction: boolean;
  port: number;
  host: string;
  logLevel: string;
  redis: ReturnType<typeof getRedisConfig>;
  maxWorkers: number;
  concurrency: number;
  jobTimeout: number;
  validate: () => void;
}

const config: AppConfig = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Redis
  redis: getRedisConfig(),

  // Job settings
  maxWorkers: parseInt(process.env.MAX_WORKERS || '4', 10),
  concurrency: parseInt(process.env.CONCURRENCY || '5', 10),
  jobTimeout: parseInt(process.env.JOB_TIMEOUT || '300000', 10), // 5 minutes

  // Validation
  validate () {
    const errors: string[] = [];

    if (!this.redis.host) {
      errors.push('REDIS_HOST is required');
    }

    if (this.port < 1 || this.port > 65535) {
      errors.push('PORT must be between 1 and 65535');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration errors:\n${errors.join('\n')}`);
    }
  },
};

config.validate();

export default config;
