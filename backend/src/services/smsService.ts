import { formatInTimeZone } from 'date-fns-tz';
import twilio from 'twilio';
import { IAppointment } from '../models/Appointment';
import { ICustomer } from '../models/Customer';
import { IService } from '../models/Service';
import { IStaff } from '../models/Staff';
import { ITenant } from '../models/Tenant';
import { logger } from '../utils/logger';

interface AppointmentSMSData {
  appointment: IAppointment;
  customer: ICustomer;
  service: IService;
  staff?: IStaff;
  tenant: ITenant;
  rescheduleLink?: string;
}

class SMSService {
  private client: twilio.Twilio;
  private twilioPhoneNumber: string;
  private twilioWhatsAppNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      logger.warn('Twilio credentials not configured');
      // Create a dummy client to prevent errors
      this.client = {} as twilio.Twilio;
    } else {
      this.client = twilio(accountSid, authToken);
    }

    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '';
    this.twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || '';
  }

  /**
   * Check if SMS/WhatsApp is configured
   */
  private isConfigured(): boolean {
    return !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      this.twilioPhoneNumber
    );
  }

  /**
   * Format appointment date and time for SMS
   */
  private formatAppointmentTime(appointment: IAppointment, timezone: string): string {
    const dateStr = formatInTimeZone(appointment.startTime, timezone, 'EEE, MMM d, yyyy');
    const timeStr = formatInTimeZone(appointment.startTime, timezone, 'h:mm a');
    const endTimeStr = formatInTimeZone(appointment.endTime, timezone, 'h:mm a zzz');

    return `${dateStr} at ${timeStr} - ${endTimeStr}`;
  }

  /**
   * Send SMS with error handling
   */
  private async sendSMS(to: string, message: string): Promise<void> {
    if (!this.isConfigured()) {
      logger.warn('SMS service not configured, skipping SMS send');
      return;
    }

    try {
      await this.client.messages.create({
        body: message,
        from: this.twilioPhoneNumber,
        to: to,
      });

      logger.info(`SMS sent successfully to ${to}`);
    } catch (error) {
      logger.error('Failed to send SMS', {
        to,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Send WhatsApp message with error handling
   */
  private async sendWhatsApp(to: string, message: string): Promise<void> {
    if (!this.isConfigured() || !this.twilioWhatsAppNumber) {
      logger.warn('WhatsApp service not configured, skipping WhatsApp send');
      return;
    }

    try {
      // Format phone number for WhatsApp (must include whatsapp: prefix)
      const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      await this.client.messages.create({
        body: message,
        from: this.twilioWhatsAppNumber,
        to: whatsappTo,
      });

      logger.info(`WhatsApp message sent successfully to ${to}`);
    } catch (error) {
      logger.error('Failed to send WhatsApp message', {
        to,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Send message via SMS or WhatsApp based on availability
   * Tries WhatsApp first, falls back to SMS
   */
  private async sendMessage(to: string, message: string): Promise<void> {
    if (!to) {
      logger.warn('No phone number provided, skipping message send');
      return;
    }

    // Try WhatsApp first if configured
    if (this.twilioWhatsAppNumber) {
      try {
        await this.sendWhatsApp(to, message);
        return;
      } catch (error) {
        logger.warn('WhatsApp send failed, falling back to SMS', {
          error: (error as Error).message,
        });
      }
    }

    // Fall back to SMS
    await this.sendSMS(to, message);
  }

  /**
   * Generate confirmation message
   */
  private generateConfirmationMessage(data: AppointmentSMSData): string {
    const { appointment, customer, service, staff, tenant, rescheduleLink } = data;
    const appointmentTime = this.formatAppointmentTime(appointment, appointment.customerTimezone);

    let message = `Hi ${customer.name},\n\n`;
    message += `Your appointment has been confirmed!\n\n`;
    message += `Service: ${service.name}\n`;
    message += `Date & Time: ${appointmentTime}\n`;
    if (staff) {
      message += `Staff: ${staff.name}\n`;
    }
    message += `Duration: ${service.durationMinutes} min\n`;
    if (rescheduleLink) {
      message += `\nReschedule: ${rescheduleLink}\n`;
    }
    message += `\n${tenant.businessName}`;

    return message;
  }

  /**
   * Generate reminder message
   */
  private generateReminderMessage(data: AppointmentSMSData): string {
    const { appointment, customer, service, staff, tenant } = data;
    const appointmentTime = this.formatAppointmentTime(appointment, appointment.customerTimezone);

    let message = `Hi ${customer.name},\n\n`;
    message += `⏰ Reminder: Your appointment is in 24 hours\n\n`;
    message += `Service: ${service.name}\n`;
    message += `Date & Time: ${appointmentTime}\n`;
    if (staff) {
      message += `Staff: ${staff.name}\n`;
    }
    message += `\nWe look forward to seeing you!\n`;
    message += `\n${tenant.businessName}`;

    return message;
  }

  /**
   * Generate follow-up message
   */
  private generateFollowUpMessage(data: AppointmentSMSData): string {
    const { customer, tenant } = data;

    let message = `Hi ${customer.name},\n\n`;
    message += `Thank you for choosing ${tenant.businessName}! `;
    message += `We hope you had a great experience.\n\n`;
    message += `We'd love to see you again soon!`;

    return message;
  }

  /**
   * Generate reschedule notification message
   */
  private generateRescheduleMessage(data: AppointmentSMSData): string {
    const { appointment, customer, service, staff, tenant, rescheduleLink } = data;
    const appointmentTime = this.formatAppointmentTime(appointment, appointment.customerTimezone);

    let message = `Hi ${customer.name},\n\n`;
    message += `Your appointment has been rescheduled.\n\n`;
    message += `Service: ${service.name}\n`;
    message += `New Date & Time: ${appointmentTime}\n`;
    if (staff) {
      message += `Staff: ${staff.name}\n`;
    }
    if (rescheduleLink) {
      message += `\nReschedule again: ${rescheduleLink}\n`;
    }
    message += `\n${tenant.businessName}`;

    return message;
  }

  /**
   * Generate cancellation message
   */
  private generateCancellationMessage(data: AppointmentSMSData): string {
    const { appointment, customer, service, tenant } = data;
    const appointmentTime = this.formatAppointmentTime(appointment, appointment.customerTimezone);

    let message = `Hi ${customer.name},\n\n`;
    message += `Your appointment has been cancelled.\n\n`;
    message += `Service: ${service.name}\n`;
    message += `Date & Time: ${appointmentTime}\n`;
    message += `\nWe hope to see you again soon!\n`;
    message += `\n${tenant.businessName}`;

    return message;
  }

  /**
   * Generate no-show reminder message
   */
  private generateNoShowReminderMessage(data: AppointmentSMSData): string {
    const { customer, service, tenant } = data;

    let message = `Hi ${customer.name},\n\n`;
    message += `We missed you at your recent ${service.name} appointment.\n\n`;
    message += `We understand things come up! `;
    message += `We'd love to see you again and help you reschedule.\n`;
    message += `\n${tenant.businessName}`;

    return message;
  }

  /**
   * Public API methods
   */

  async sendConfirmation(data: AppointmentSMSData): Promise<void> {
    if (!data.customer.phone) {
      logger.info('No phone number for customer, skipping SMS confirmation');
      return;
    }

    const message = this.generateConfirmationMessage(data);
    await this.sendMessage(data.customer.phone, message);
  }

  async sendReminder(data: AppointmentSMSData): Promise<void> {
    if (!data.customer.phone) {
      logger.info('No phone number for customer, skipping SMS reminder');
      return;
    }

    const message = this.generateReminderMessage(data);
    await this.sendMessage(data.customer.phone, message);
  }

  async sendFollowUp(data: AppointmentSMSData): Promise<void> {
    if (!data.customer.phone) {
      logger.info('No phone number for customer, skipping SMS follow-up');
      return;
    }

    const message = this.generateFollowUpMessage(data);
    await this.sendMessage(data.customer.phone, message);
  }

  async sendRescheduleNotification(data: AppointmentSMSData): Promise<void> {
    if (!data.customer.phone) {
      logger.info('No phone number for customer, skipping SMS reschedule notification');
      return;
    }

    const message = this.generateRescheduleMessage(data);
    await this.sendMessage(data.customer.phone, message);
  }

  async sendCancellation(data: AppointmentSMSData): Promise<void> {
    if (!data.customer.phone) {
      logger.info('No phone number for customer, skipping SMS cancellation');
      return;
    }

    const message = this.generateCancellationMessage(data);
    await this.sendMessage(data.customer.phone, message);
  }

  async sendNoShowReminder(data: AppointmentSMSData): Promise<void> {
    if (!data.customer.phone) {
      logger.info('No phone number for customer, skipping SMS no-show reminder');
      return;
    }

    const message = this.generateNoShowReminderMessage(data);
    await this.sendMessage(data.customer.phone, message);
  }
}

export default new SMSService();
export { AppointmentSMSData };
