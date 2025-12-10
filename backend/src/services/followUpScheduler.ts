import { followUpQueue } from '../config/queue';
import { logger } from '../utils/logger';

/**
 * Service to schedule follow-up and no-show reminder jobs
 * Requirements: 9.3, 9.4
 */
class FollowUpScheduler {
  /**
   * Schedule a follow-up message for a completed appointment
   * Sends immediately after appointment is marked as completed
   */
  async scheduleFollowUp(appointmentId: string): Promise<void> {
    try {
      if (!followUpQueue) {
        logger.warn('Follow-up queue not available (Redis disabled)', { appointmentId });
        return;
      }

      // Send follow-up immediately (or with a small delay if preferred)
      await followUpQueue.add(
        'send-follow-up',
        {
          appointmentId,
          type: 'follow-up',
        },
        {
          delay: 5000, // 5 second delay to ensure appointment is fully processed
          jobId: `follow-up-${appointmentId}`, // Unique job ID to prevent duplicates
          removeOnComplete: true,
          removeOnFail: false, // Keep failed jobs for debugging
          attempts: 3, // Retry up to 3 times
          backoff: {
            type: 'exponential',
            delay: 60000, // Start with 1 minute delay
          },
        }
      );

      logger.info('Follow-up scheduled successfully', {
        appointmentId,
      });
    } catch (error) {
      logger.error('Failed to schedule follow-up', {
        appointmentId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Schedule a no-show rebooking reminder
   * Sends within 24 hours after appointment is marked as no-show
   */
  async scheduleNoShowReminder(appointmentId: string): Promise<void> {
    try {
      if (!followUpQueue) {
        logger.warn('Follow-up queue not available (Redis disabled)', { appointmentId });
        return;
      }

      // Send no-show reminder within 24 hours (using 1 hour delay for this implementation)
      // In production, you might want to send it after a few hours
      await followUpQueue.add(
        'send-no-show-reminder',
        {
          appointmentId,
          type: 'no-show-reminder',
        },
        {
          delay: 60 * 60 * 1000, // 1 hour delay
          jobId: `no-show-${appointmentId}`, // Unique job ID to prevent duplicates
          removeOnComplete: true,
          removeOnFail: false, // Keep failed jobs for debugging
          attempts: 3, // Retry up to 3 times
          backoff: {
            type: 'exponential',
            delay: 60000, // Start with 1 minute delay
          },
        }
      );

      logger.info('No-show reminder scheduled successfully', {
        appointmentId,
      });
    } catch (error) {
      logger.error('Failed to schedule no-show reminder', {
        appointmentId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Cancel a scheduled follow-up or no-show reminder
   * Used when appointment status changes
   */
  async cancelFollowUp(appointmentId: string): Promise<void> {
    try {
      if (!followUpQueue) {
        logger.warn('Follow-up queue not available (Redis disabled)', { appointmentId });
        return;
      }

      const followUpJobId = `follow-up-${appointmentId}`;
      const noShowJobId = `no-show-${appointmentId}`;

      const [followUpJob, noShowJob] = await Promise.all([
        followUpQueue.getJob(followUpJobId),
        followUpQueue.getJob(noShowJobId),
      ]);

      const removals = [];
      if (followUpJob) {
        removals.push(followUpJob.remove());
      }
      if (noShowJob) {
        removals.push(noShowJob.remove());
      }

      if (removals.length > 0) {
        await Promise.all(removals);
        logger.info('Follow-up jobs cancelled successfully', { appointmentId });
      } else {
        logger.info('No follow-up jobs found to cancel', { appointmentId });
      }
    } catch (error) {
      logger.error('Failed to cancel follow-up jobs', {
        appointmentId,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export default new FollowUpScheduler();
