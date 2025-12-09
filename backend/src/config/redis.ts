import Redis from 'ioredis';
import { logger } from '../utils/logger';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD;

export const redis = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

export const disconnectRedis = async (): Promise<void> => {
  try {
    await redis.quit();
    logger.info('Redis disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
    throw error;
  }
};
