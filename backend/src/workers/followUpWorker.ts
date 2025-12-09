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

interface FollowUpJobData {
  appointmentId: string;
  type: 'follow-up' | 'no-show-reminder';
}

/**
 * Worker to process follow-up and no-show reminder jobs
 * Sends follow-up messages for completed appointments
 * Sends rebooking reminders for no-show appointments
 * Requirements: 9.3, 9.4
 */
const followUpWorker = new Worker<FollowUpJobData>(
  'follow-ups',
  async (job: Job<FollowUpJobData>) => {
    const { appointmentId, type } = job.data;

    try {
      logger.info('Processing follow-up job', {
        jobId: job.id,
        appointmentId,
        type,
      });

      // Fetch appointment with all related data
      const appointment = await Appointment.findById(appointmentId);

      if (!appointment) {
        logger.warn('Appointment not found for follow-up', { appointmentId });
        return { success: false, reason: 'Appointment not found' };
      }

      // Verify appointment status matches job type
      if (type === 'follow-up' && appointment.status !== 'completed') {
        logger.info('Skipping follow-up for non-completed appointment', {
          appointmentId,
          status: appointment.status,
        });
        return { success: false, reason: 'Appointment not completed' };
      }

      if (type === 'no-show-reminder' && appointment.status !== 'no-show') {
        logger.info('Skipping no-show reminder for non-no-show appointment', {
          appointmentId,
          status: appointment.status,
        });
        return { success: false, reason: 'Appointment not marked as no-show' };
      }

      // Fetch related data
      const [customer, service, staff, tenant] = await Promise.all([
        Customer.findById(appointment.customerId),
        Service.findById(appointment.serviceId),
        appointment.staffId ? Staff.findById(appointment.staffId) : null,
        Tenant.findById(appointment.tenantId),
      ]);

      if (!customer || !service || !tenant) {
        logger.error('Missing related data for follow-up', {
          appointmentId,
          hasCustomer: !!customer,
          hasService: !!service,
          hasTenant: !!tenant,
        });
        return { success: false, reason: 'Missing related data' };
      }

      // Send appropriate notification based on type
      if (type === 'follow-up') {
        await notificationService.sendFollowUpMessage({
          appointment,
          customer,
          service,
          staff: staff || undefined,
          tenant,
        });
      } else if (type === 'no-show-reminder') {
        await notificationService.sendNoShowReminder({
          appointment,
          customer,
          service,
          staff: staff || undefined,
          tenant,
        });
      }

      logger.info('Follow-up job completed successfully', {
        jobId: job.id,
        appointmentId,
        type,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to process follow-up job', {
        jobId: job.id,
        appointmentId,
        type,
        error: (error as Error).message,
      });
      throw error;
    }
  },
  {
    connection,
    concurrency: 5, // Process up to 5 follow-ups concurrently
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000, // per second
    },
  }
);

// Event listeners
followUpWorker.on('completed', (job) => {
  logger.info('Follow-up worker completed job', { jobId: job.id });
});

followUpWorker.on('failed', (job, err) => {
  logger.error('Follow-up worker failed job', {
    jobId: job?.id,
    error: err.message,
  });
});

followUpWorker.on('error', (err) => {
  logger.error('Follow-up worker error', { error: err.message });
});

export default followUpWorker;
