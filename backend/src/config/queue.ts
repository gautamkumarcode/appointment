import { logger } from '../utils/logger';

const redisEnabled = process.env.REDIS_ENABLED === 'true';

// Queue definitions - only create if Redis is enabled
export let reminderQueue: any = null;
export let notificationQueue: any = null;
export let followUpQueue: any = null;
export let paymentQueue: any = null;

if (redisEnabled) {
  logger.info('Redis is enabled, initializing BullMQ queues...');
  // Only import and initialize BullMQ if Redis is explicitly enabled
  try {
    const { Queue } = require('bullmq');

    const connection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
    };

    reminderQueue = new Queue('reminders', { connection });
    notificationQueue = new Queue('notifications', { connection });
    followUpQueue = new Queue('follow-ups', { connection });
    paymentQueue = new Queue('payments', { connection });

    logger.info('BullMQ queues initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize BullMQ queues:', (error as Error).message);
    reminderQueue = null;
    notificationQueue = null;
    followUpQueue = null;
    paymentQueue = null;
  }
} else {
  logger.info('Redis is disabled - running without background job queues');
}

// Graceful shutdown
export const closeQueues = async (): Promise<void> => {
  if (!redisEnabled) {
    logger.info('No queues to close (Redis disabled)');
    return;
  }

  const closingPromises: Promise<void>[] = [];

  if (reminderQueue) closingPromises.push(reminderQueue.close());
  if (notificationQueue) closingPromises.push(notificationQueue.close());
  if (followUpQueue) closingPromises.push(followUpQueue.close());
  if (paymentQueue) closingPromises.push(paymentQueue.close());

  if (closingPromises.length > 0) {
    await Promise.all(closingPromises);
    logger.info('All queues closed successfully');
  }
};

// Helper function to check if queues are available
export const areQueuesAvailable = (): boolean => {
  return redisEnabled && reminderQueue !== null;
};
