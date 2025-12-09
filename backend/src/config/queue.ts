import { Queue, QueueEvents } from 'bullmq';
import { logger } from '../utils/logger';

// Connection configuration for BullMQ
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
};

// Queue definitions
export const reminderQueue = new Queue('reminders', { connection });
export const notificationQueue = new Queue('notifications', { connection });
export const followUpQueue = new Queue('follow-ups', { connection });
export const paymentQueue = new Queue('payments', { connection });

// Queue events for monitoring
const reminderEvents = new QueueEvents('reminders', { connection });
const notificationEvents = new QueueEvents('notifications', { connection });
const followUpEvents = new QueueEvents('follow-ups', { connection });
const paymentEvents = new QueueEvents('payments', { connection });

// Event listeners for logging
reminderEvents.on('completed', ({ jobId }) => {
  logger.info(`Reminder job ${jobId} completed`);
});

reminderEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Reminder job ${jobId} failed: ${failedReason}`);
});

notificationEvents.on('completed', ({ jobId }) => {
  logger.info(`Notification job ${jobId} completed`);
});

notificationEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Notification job ${jobId} failed: ${failedReason}`);
});

followUpEvents.on('completed', ({ jobId }) => {
  logger.info(`Follow-up job ${jobId} completed`);
});

followUpEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Follow-up job ${jobId} failed: ${failedReason}`);
});

paymentEvents.on('completed', ({ jobId }) => {
  logger.info(`Payment job ${jobId} completed`);
});

paymentEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Payment job ${jobId} failed: ${failedReason}`);
});

// Graceful shutdown
export const closeQueues = async (): Promise<void> => {
  await Promise.all([
    reminderQueue.close(),
    notificationQueue.close(),
    followUpQueue.close(),
    paymentQueue.close(),
    reminderEvents.close(),
    notificationEvents.close(),
    followUpEvents.close(),
    paymentEvents.close(),
  ]);
  logger.info('All queues closed successfully');
};
