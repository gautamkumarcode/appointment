import { logger } from '../utils/logger';

const redisEnabled = process.env.REDIS_ENABLED === 'true';

let redis: any = null;

if (redisEnabled) {
  try {
    const Redis = require('ioredis');

    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisPassword = process.env.REDIS_PASSWORD;

    redis = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true, // Don't connect immediately
    });

    redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redis.on('error', (error: Error) => {
      logger.warn('Redis connection error (continuing without Redis):', error.message);
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });

    logger.info('Redis client initialized');
  } catch (error) {
    logger.error('Failed to initialize Redis client:', (error as Error).message);
    redis = null;
  }
} else {
  logger.info('Redis disabled - running without Redis features');
}

export { redis };

export const disconnectRedis = async (): Promise<void> => {
  if (redis) {
    try {
      await redis.quit();
      logger.info('Redis disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }
};

// Helper function to check if Redis is available
export const isRedisAvailable = (): boolean => {
  return redis !== null && redisEnabled;
};
