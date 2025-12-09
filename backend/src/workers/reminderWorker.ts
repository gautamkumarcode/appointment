import { Job, Worker } from 'bullmq';
import { Appointment } from '../models/Appointment';
import { Customer } from '../models/Customer';
import { Service } from '../models/Service';
import { Staff } from '../models/Staff';
import { Tenant } from '../models/Tenant';
import notificationService from '../services/notificationService';
import { logger } from '../utils/logger';

// Connection configuration for BullMQ
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
};

interface ReminderJobData {
  appointmentId: string;
}

/**
 * Worker to process reminder jobs
 * Sends email and SMS/WhatsApp reminders 24 hours before appointments
 * Requirements: 9.1, 9.2, 9.5
 */
const reminderWorker = new Worker<ReminderJobData>(
  'reminders',
  async (job: Job<ReminderJobData>) => {
    const { appointmentId } = job.data;

    try {
      logger.info('Processing reminder job', {
        jobId: job.id,
        appointmentId,
      });

      // Fetch appointment with all related data
      const appointment = await Appointment.findById(appointmentId);

      if (!appointment) {
        logger.warn('Appointment not found for reminder', { appointmentId });
        return { success: false, reason: 'Appointment not found' };
      }

      // Skip if appointment is not in confirmed status
      if (appointment.status !== 'confirmed') {
        logger.info('Skipping reminder for non-confirmed appointment', {
          appointmentId,
          status: appointment.status,
        });
        return { success: false, reason: 'Appointment not confirmed' };
      }

      // Fetch related data
      const [customer, service, staff, tenant] = await Promise.all([
        Customer.findById(appointment.customerId),
        Service.findById(appointment.serviceId),
        appointment.staffId ? Staff.findById(appointment.staffId) : null,
        Tenant.findById(appointment.tenantId),
      ]);

      if (!customer || !service || !tenant) {
        logger.error('Missing related data for reminder', {
          appointmentId,
          hasCustomer: !!customer,
          hasService: !!service,
          hasTenant: !!tenant,
        });
        return { success: false, reason: 'Missing related data' };
      }

      // Send reminder notifications
      await notificationService.sendAppointmentReminder({
        appointment,
        customer,
        service,
        staff: staff || undefined,
        tenant,
      });

      logger.info('Reminder sent successfully', {
        jobId: job.id,
        appointmentId,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to process reminder job', {
        jobId: job.id,
        appointmentId,
        error: (error as Error).message,
      });
      throw error;
    }
  },
  {
    connection,
    concurrency: 5, // Process up to 5 reminders concurrently
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000, // per second
    },
  }
);

// Event listeners
reminderWorker.on('completed', (job) => {
  logger.info('Reminder worker completed job', { jobId: job.id });
});

reminderWorker.on('failed', (job, err) => {
  logger.error('Reminder worker failed job', {
    jobId: job?.id,
    error: err.message,
  });
});

reminderWorker.on('error', (err) => {
  logger.error('Reminder worker error', { error: err.message });
});

export default reminderWorker;
