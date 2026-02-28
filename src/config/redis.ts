/**
 * Redis connection configuration
 * Configures the Redis client used by BullMQ
 */

interface RedisConfig {
  host: string;
  port: number;
  db: number;
  password?: string;
  maxRetriesPerRequest: null;
  enableReadyCheck: false;
  retryStrategy: (times: number) => number;
}

const getRedisConfig = (): RedisConfig => {
  const password = process.env.REDIS_PASSWORD;

  const config: RedisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    db: parseInt(process.env.REDIS_DB || '0', 10),
    // Connection pool settings for better performance
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    // For development, use more verbose error handling
    retryStrategy: (times: number): number => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  };

  // Add password if provided
  if (password) {
    config.password = password;
  }

  return config;
};

export default getRedisConfig;
