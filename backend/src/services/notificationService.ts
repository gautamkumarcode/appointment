import { IAppointment } from '../models/Appointment';
import { ICustomer } from '../models/Customer';
import { IService } from '../models/Service';
import { IStaff } from '../models/Staff';
import { ITenant } from '../models/Tenant';
import { logger } from '../utils/logger';
import calendarService from './calendarService';
import emailService from './emailService';
import smsService from './smsService';

interface NotificationData {
  appointment: IAppointment;
  customer: ICustomer;
  service: IService;
  staff?: IStaff;
  tenant: ITenant;
}

class NotificationService {
  /**
   * Generate reschedule link for an appointment
   */
  private generateRescheduleLink(
    tenantSlug: string,
    appointmentId: string,
    rescheduleToken: string
  ): string {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    return `${frontendUrl}/book/${tenantSlug}/reschedule/${appointmentId}?token=${rescheduleToken}`;
  }

  /**
   * Send all confirmation notifications when appointment is created
   * Includes email, SMS/WhatsApp, and calendar invite
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  async sendAppointmentConfirmation(data: NotificationData): Promise<void> {
    const { appointment, customer, service, staff, tenant } = data;

    try {
      logger.info('Sending appointment confirmation notifications', {
        appointmentId: appointment._id,
        customerEmail: customer.email,
        customerPhone: customer.phone,
      });

      // Generate reschedule link if token exists
      const rescheduleLink = appointment.rescheduleToken
        ? this.generateRescheduleLink(
            tenant.slug,
            appointment._id.toString(),
            appointment.rescheduleToken
          )
        : undefined;

      // Generate calendar invite
      const calendarInvite = calendarService.generateCalendarInvite({
        appointment,
        customer,
        service,
        staff,
        tenant,
      });

      // Prepare data for notifications
      const emailData = {
        appointment,
        customer,
        service,
        staff,
        tenant,
        rescheduleLink,
      };

      const smsData = {
        appointment,
        customer,
        service,
        staff,
        tenant,
        rescheduleLink,
      };

      // Send email confirmation with calendar invite
      await emailService.sendConfirmation(emailData, calendarInvite);

      // Send SMS/WhatsApp confirmation if phone number is provided
      if (customer.phone) {
        try {
          await smsService.sendConfirmation(smsData);
        } catch (error) {
          // Log but don't fail if SMS fails
          logger.error('Failed to send SMS confirmation', {
            appointmentId: appointment._id,
            error: (error as Error).message,
          });
        }
      }

      logger.info('Appointment confirmation notifications sent successfully', {
        appointmentId: appointment._id,
      });
    } catch (error) {
      logger.error('Failed to send appointment confirmation notifications', {
        appointmentId: appointment._id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Send reminder notifications 24 hours before appointment
   * Requirements: 9.1, 9.2
   */
  async sendAppointmentReminder(data: NotificationData): Promise<void> {
    const { appointment, customer, service, staff, tenant } = data;

    try {
      logger.info('Sending appointment reminder notifications', {
        appointmentId: appointment._id,
        customerEmail: customer.email,
        customerPhone: customer.phone,
      });

      const emailData = {
        appointment,
        customer,
        service,
        staff,
        tenant,
      };

      const smsData = {
        appointment,
        customer,
        service,
        staff,
        tenant,
      };

      // Send email reminder
      await emailService.sendReminder(emailData);

      // Send SMS/WhatsApp reminder if phone number is provided
      if (customer.phone) {
        try {
          await smsService.sendReminder(smsData);
        } catch (error) {
          // Log but don't fail if SMS fails
          logger.error('Failed to send SMS reminder', {
            appointmentId: appointment._id,
            error: (error as Error).message,
          });
        }
      }

      logger.info('Appointment reminder notifications sent successfully', {
        appointmentId: appointment._id,
      });
    } catch (error) {
      logger.error('Failed to send appointment reminder notifications', {
        appointmentId: appointment._id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Send follow-up message after completed appointment
   * Requirement: 9.3
   */
  async sendFollowUpMessage(data: NotificationData): Promise<void> {
    const { appointment, customer, service, staff, tenant } = data;

    try {
      logger.info('Sending follow-up message', {
        appointmentId: appointment._id,
        customerEmail: customer.email,
      });

      const emailData = {
        appointment,
        customer,
        service,
        staff,
        tenant,
      };

      const smsData = {
        appointment,
        customer,
        service,
        staff,
        tenant,
      };

      // Send email follow-up
      await emailService.sendFollowUp(emailData);

      // Send SMS/WhatsApp follow-up if phone number is provided
      if (customer.phone) {
        try {
          await smsService.sendFollowUp(smsData);
        } catch (error) {
          // Log but don't fail if SMS fails
          logger.error('Failed to send SMS follow-up', {
            appointmentId: appointment._id,
            error: (error as Error).message,
          });
        }
      }

      logger.info('Follow-up message sent successfully', {
        appointmentId: appointment._id,
      });
    } catch (error) {
      logger.error('Failed to send follow-up message', {
        appointmentId: appointment._id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Send reschedule notification when appointment is rescheduled
   * Requirements: 7.5, 20.4
   */
  async sendRescheduleNotification(data: NotificationData): Promise<void> {
    const { appointment, customer, service, staff, tenant } = data;

    try {
      logger.info('Sending reschedule notification', {
        appointmentId: appointment._id,
        customerEmail: customer.email,
      });

      // Generate reschedule link if token exists
      const rescheduleLink = appointment.rescheduleToken
        ? this.generateRescheduleLink(
            tenant.slug,
            appointment._id.toString(),
            appointment.rescheduleToken
          )
        : undefined;

      // Generate updated calendar invite
      const calendarInvite = calendarService.generateCalendarInvite({
        appointment,
        customer,
        service,
        staff,
        tenant,
      });

      const emailData = {
        appointment,
        customer,
        service,
        staff,
        tenant,
        rescheduleLink,
      };

      const smsData = {
        appointment,
        customer,
        service,
        staff,
        tenant,
        rescheduleLink,
      };

      // Send email notification with updated calendar invite
      await emailService.sendRescheduleNotification(emailData, calendarInvite);

      // Send SMS/WhatsApp notification if phone number is provided
      if (customer.phone) {
        try {
          await smsService.sendRescheduleNotification(smsData);
        } catch (error) {
          // Log but don't fail if SMS fails
          logger.error('Failed to send SMS reschedule notification', {
            appointmentId: appointment._id,
            error: (error as Error).message,
          });
        }
      }

      logger.info('Reschedule notification sent successfully', {
        appointmentId: appointment._id,
      });
    } catch (error) {
      logger.error('Failed to send reschedule notification', {
        appointmentId: appointment._id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Send cancellation notification when appointment is cancelled
   * Requirements: 7.5, 20.4
   */
  async sendCancellationNotification(data: NotificationData): Promise<void> {
    const { appointment, customer, service, staff, tenant } = data;

    try {
      logger.info('Sending cancellation notification', {
        appointmentId: appointment._id,
        customerEmail: customer.email,
      });

      const emailData = {
        appointment,
        customer,
        service,
        staff,
        tenant,
      };

      const smsData = {
        appointment,
        customer,
        service,
        staff,
        tenant,
      };

      // Send email cancellation
      await emailService.sendCancellation(emailData);

      // Send SMS/WhatsApp cancellation if phone number is provided
      if (customer.phone) {
        try {
          await smsService.sendCancellation(smsData);
        } catch (error) {
          // Log but don't fail if SMS fails
          logger.error('Failed to send SMS cancellation', {
            appointmentId: appointment._id,
            error: (error as Error).message,
          });
        }
      }

      logger.info('Cancellation notification sent successfully', {
        appointmentId: appointment._id,
      });
    } catch (error) {
      logger.error('Failed to send cancellation notification', {
        appointmentId: appointment._id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Send no-show rebooking reminder
   * Requirement: 9.4
   */
  async sendNoShowReminder(data: NotificationData): Promise<void> {
    const { appointment, customer, service, staff, tenant } = data;

    try {
      logger.info('Sending no-show rebooking reminder', {
        appointmentId: appointment._id,
        customerEmail: customer.email,
      });

      const emailData = {
        appointment,
        customer,
        service,
        staff,
        tenant,
      };

      const smsData = {
        appointment,
        customer,
        service,
        staff,
        tenant,
      };

      // Send email reminder
      await emailService.sendNoShowReminder(emailData);

      // Send SMS/WhatsApp reminder if phone number is provided
      if (customer.phone) {
        try {
          await smsService.sendNoShowReminder(smsData);
        } catch (error) {
          // Log but don't fail if SMS fails
          logger.error('Failed to send SMS no-show reminder', {
            appointmentId: appointment._id,
            error: (error as Error).message,
          });
        }
      }

      logger.info('No-show reminder sent successfully', {
        appointmentId: appointment._id,
      });
    } catch (error) {
      logger.error('Failed to send no-show reminder', {
        appointmentId: appointment._id,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export default new NotificationService();
export { NotificationData };
