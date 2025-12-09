import { reminderQueue } from '../config/queue';
import { Appointment } from '../models/Appointment';
import { logger } from '../utils/logger';

/**
 * Service to schedule reminder jobs for appointments
 * Checks for appointments 24 hours in advance and schedules reminders
 * Requirements: 9.1, 9.2, 9.5
 */
class ReminderScheduler {
  /**
   * Schedule a reminder for a specific appointment
   * The reminder will be sent 24 hours before the appointment time
   */
  async scheduleReminder(appointmentId: string, appointmentTime: Date): Promise<void> {
    try {
      // Calculate when to send the reminder (24 hours before appointment)
      const reminderTime = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000);
      const now = new Date();

      // Only schedule if reminder time is in the future
      if (reminderTime <= now) {
        logger.info('Reminder time is in the past, skipping', {
          appointmentId,
          appointmentTime,
          reminderTime,
        });
        return;
      }

      // Calculate delay in milliseconds
      const delay = reminderTime.getTime() - now.getTime();

      // Add job to queue with delay
      await reminderQueue.add(
        'send-reminder',
        { appointmentId },
        {
          delay,
          jobId: `reminder-${appointmentId}`, // Unique job ID to prevent duplicates
          removeOnComplete: true,
          removeOnFail: false, // Keep failed jobs for debugging
          attempts: 3, // Retry up to 3 times
          backoff: {
            type: 'exponential',
            delay: 60000, // Start with 1 minute delay
          },
        }
      );

      logger.info('Reminder scheduled successfully', {
        appointmentId,
        appointmentTime,
        reminderTime,
        delayMs: delay,
      });
    } catch (error) {
      logger.error('Failed to schedule reminder', {
        appointmentId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Cancel a scheduled reminder for an appointment
   * Used when appointment is cancelled or rescheduled
   */
  async cancelReminder(appointmentId: string): Promise<void> {
    try {
      const jobId = `reminder-${appointmentId}`;
      const job = await reminderQueue.getJob(jobId);

      if (job) {
        await job.remove();
        logger.info('Reminder cancelled successfully', { appointmentId });
      } else {
        logger.info('No reminder found to cancel', { appointmentId });
      }
    } catch (error) {
      logger.error('Failed to cancel reminder', {
        appointmentId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Reschedule a reminder for an appointment
   * Used when appointment time is changed
   */
  async rescheduleReminder(appointmentId: string, newAppointmentTime: Date): Promise<void> {
    try {
      // Cancel existing reminder
      await this.cancelReminder(appointmentId);

      // Schedule new reminder
      await this.scheduleReminder(appointmentId, newAppointmentTime);

      logger.info('Reminder rescheduled successfully', {
        appointmentId,
        newAppointmentTime,
      });
    } catch (error) {
      logger.error('Failed to reschedule reminder', {
        appointmentId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Scan for appointments that need reminders scheduled
   * This can be run periodically to catch any missed reminders
   * Useful for system recovery after downtime
   */
  async scanAndScheduleReminders(): Promise<void> {
    try {
      logger.info('Starting reminder scan');

      const now = new Date();
      const twentyFiveHoursFromNow = new Date(now.getTime() + 25 * 60 * 60 * 1000);

      // Find confirmed appointments in the next 25 hours
      // (24 hours + 1 hour buffer to catch appointments that might have been missed)
      const appointments = await Appointment.find({
        status: 'confirmed',
        startTime: {
          $gte: now,
          $lte: twentyFiveHoursFromNow,
        },
      });

      logger.info(`Found ${appointments.length} appointments needing reminders`);

      // Schedule reminders for each appointment
      const results = await Promise.allSettled(
        appointments.map((appointment) =>
          this.scheduleReminder(appointment._id.toString(), appointment.startTime)
        )
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      logger.info('Reminder scan completed', {
        total: appointments.length,
        successful,
        failed,
      });
    } catch (error) {
      logger.error('Failed to scan and schedule reminders', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export default new ReminderScheduler();
