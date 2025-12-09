import cron from 'node-cron';
import reminderScheduler from '../services/reminderScheduler';
import { logger } from '../utils/logger';

/**
 * Cron scheduler for periodic background tasks
 * Requirements: 9.1, 9.2, 9.5
 */
class CronScheduler {
  private reminderScanTask: cron.ScheduledTask | null = null;

  /**
   * Start all scheduled tasks
   */
  start(): void {
    logger.info('Starting cron scheduler');

    // Run reminder scan every hour to catch any missed reminders
    // This ensures system recovery after downtime
    this.reminderScanTask = cron.schedule('0 * * * *', async () => {
      logger.info('Running scheduled reminder scan');
      try {
        await reminderScheduler.scanAndScheduleReminders();
      } catch (error) {
        logger.error('Reminder scan failed', {
          error: (error as Error).message,
        });
      }
    });

    logger.info('Cron scheduler started successfully');
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    logger.info('Stopping cron scheduler');

    if (this.reminderScanTask) {
      this.reminderScanTask.stop();
      this.reminderScanTask = null;
    }

    logger.info('Cron scheduler stopped successfully');
  }
}

export default new CronScheduler();
