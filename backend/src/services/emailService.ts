import { formatInTimeZone } from 'date-fns-tz';
import nodemailer, { Transporter } from 'nodemailer';
import { IAppointment } from '../models/Appointment';
import { ICustomer } from '../models/Customer';
import { IService } from '../models/Service';
import { IStaff } from '../models/Staff';
import { ITenant } from '../models/Tenant';
import { logger } from '../utils/logger';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface AppointmentEmailData {
  appointment: IAppointment;
  customer: ICustomer;
  service: IService;
  staff?: IStaff;
  tenant: ITenant;
  rescheduleLink?: string;
}

class EmailService {
  private transporter: Transporter;
  private fromEmail: string;
  private fromName: string;
  private maxRetries: number = 3;

  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@example.com';
    this.fromName = process.env.FROM_NAME || 'AI Appointment Scheduler';

    // Configure nodemailer with SendGrid
    this.transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY || '',
      },
    });
  }

  /**
   * Send email with retry logic
   */
  private async sendWithRetry(
    to: string,
    subject: string,
    html: string,
    text: string,
    attachments?: any[]
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.transporter.sendMail({
          from: `"${this.fromName}" <${this.fromEmail}>`,
          to,
          subject,
          html,
          text,
          attachments,
        });

        logger.info(`Email sent successfully to ${to}`, { subject, attempt });
        return;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Email send attempt ${attempt} failed for ${to}`, {
          error: lastError.message,
          subject,
        });

        if (attempt < this.maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    logger.error(`Failed to send email after ${this.maxRetries} attempts`, {
      to,
      subject,
      error: lastError?.message,
    });
    throw new Error(`Failed to send email: ${lastError?.message}`);
  }

  /**
   * Format appointment date and time for display
   */
  private formatAppointmentTime(appointment: IAppointment, timezone: string): string {
    const dateStr = formatInTimeZone(appointment.startTime, timezone, 'EEEE, MMMM d, yyyy');
    const timeStr = formatInTimeZone(appointment.startTime, timezone, 'h:mm a');
    const endTimeStr = formatInTimeZone(appointment.endTime, timezone, 'h:mm a zzz');

    return `${dateStr} at ${timeStr} - ${endTimeStr}`;
  }

  /**
   * Generate appointment confirmation email template
   */
  private generateConfirmationTemplate(data: AppointmentEmailData): EmailTemplate {
    const { appointment, customer, service, staff, tenant, rescheduleLink } = data;
    const appointmentTime = this.formatAppointmentTime(appointment, appointment.customerTimezone);

    const subject = `Appointment Confirmed - ${service.name}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${tenant.primaryColor || '#4F46E5'}; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; color: #6b7280; }
            .value { color: #111827; }
            .button { display: inline-block; background-color: ${tenant.primaryColor || '#4F46E5'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Confirmed</h1>
            </div>
            <div class="content">
              <p>Hi ${customer.name},</p>
              <p>Your appointment has been confirmed! We look forward to seeing you.</p>
              
              <div class="details">
                <h2>Appointment Details</h2>
                <div class="detail-row">
                  <span class="label">Service:</span>
                  <span class="value">${service.name}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Date & Time:</span>
                  <span class="value">${appointmentTime}</span>
                </div>
                ${
                  staff
                    ? `
                <div class="detail-row">
                  <span class="label">Staff Member:</span>
                  <span class="value">${staff.name}</span>
                </div>
                `
                    : ''
                }
                <div class="detail-row">
                  <span class="label">Duration:</span>
                  <span class="value">${service.durationMinutes} minutes</span>
                </div>
                ${
                  appointment.amount
                    ? `
                <div class="detail-row">
                  <span class="label">Price:</span>
                  <span class="value">${service.currency} ${appointment.amount}</span>
                </div>
                `
                    : ''
                }
                ${
                  appointment.notes
                    ? `
                <div class="detail-row">
                  <span class="label">Notes:</span>
                  <span class="value">${appointment.notes}</span>
                </div>
                `
                    : ''
                }
              </div>

              ${
                rescheduleLink
                  ? `
              <p>Need to reschedule? Click the button below:</p>
              <a href="${rescheduleLink}" class="button">Reschedule Appointment</a>
              `
                  : ''
              }

              <p>If you have any questions, please contact us.</p>
              <p>Best regards,<br>${tenant.businessName}</p>
            </div>
            <div class="footer">
              <p>This is an automated message from ${tenant.businessName}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Appointment Confirmed

Hi ${customer.name},

Your appointment has been confirmed! We look forward to seeing you.

Appointment Details:
- Service: ${service.name}
- Date & Time: ${appointmentTime}
${staff ? `- Staff Member: ${staff.name}` : ''}
- Duration: ${service.durationMinutes} minutes
${appointment.amount ? `- Price: ${service.currency} ${appointment.amount}` : ''}
${appointment.notes ? `- Notes: ${appointment.notes}` : ''}

${rescheduleLink ? `Need to reschedule? Visit: ${rescheduleLink}` : ''}

If you have any questions, please contact us.

Best regards,
${tenant.businessName}
    `.trim();

    return { subject, html, text };
  }

  /**
   * Generate appointment reminder email template
   */
  private generateReminderTemplate(data: AppointmentEmailData): EmailTemplate {
    const { appointment, customer, service, staff, tenant } = data;
    const appointmentTime = this.formatAppointmentTime(appointment, appointment.customerTimezone);

    const subject = `Reminder: Appointment Tomorrow - ${service.name}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${tenant.primaryColor || '#4F46E5'}; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; color: #6b7280; }
            .value { color: #111827; }
            .reminder-badge { background-color: #fbbf24; color: #78350f; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Reminder</h1>
            </div>
            <div class="content">
              <div class="reminder-badge">⏰ Reminder: Your appointment is in 24 hours</div>
              
              <p>Hi ${customer.name},</p>
              <p>This is a friendly reminder about your upcoming appointment.</p>
              
              <div class="details">
                <h2>Appointment Details</h2>
                <div class="detail-row">
                  <span class="label">Service:</span>
                  <span class="value">${service.name}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Date & Time:</span>
                  <span class="value">${appointmentTime}</span>
                </div>
                ${
                  staff
                    ? `
                <div class="detail-row">
                  <span class="label">Staff Member:</span>
                  <span class="value">${staff.name}</span>
                </div>
                `
                    : ''
                }
                <div class="detail-row">
                  <span class="label">Duration:</span>
                  <span class="value">${service.durationMinutes} minutes</span>
                </div>
              </div>

              <p>We look forward to seeing you!</p>
              <p>Best regards,<br>${tenant.businessName}</p>
            </div>
            <div class="footer">
              <p>This is an automated reminder from ${tenant.businessName}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Appointment Reminder

⏰ Reminder: Your appointment is in 24 hours

Hi ${customer.name},

This is a friendly reminder about your upcoming appointment.

Appointment Details:
- Service: ${service.name}
- Date & Time: ${appointmentTime}
${staff ? `- Staff Member: ${staff.name}` : ''}
- Duration: ${service.durationMinutes} minutes

We look forward to seeing you!

Best regards,
${tenant.businessName}
    `.trim();

    return { subject, html, text };
  }

  /**
   * Generate follow-up email template
   */
  private generateFollowUpTemplate(data: AppointmentEmailData): EmailTemplate {
    const { customer, service, tenant } = data;

    const subject = `Thank You for Your Visit - ${service.name}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${tenant.primaryColor || '#4F46E5'}; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Thank You!</h1>
            </div>
            <div class="content">
              <p>Hi ${customer.name},</p>
              <p>Thank you for choosing ${tenant.businessName}! We hope you had a great experience with us.</p>
              <p>We'd love to see you again. Feel free to book your next appointment anytime.</p>
              <p>If you have any feedback or questions, please don't hesitate to reach out.</p>
              <p>Best regards,<br>${tenant.businessName}</p>
            </div>
            <div class="footer">
              <p>This is an automated message from ${tenant.businessName}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Thank You!

Hi ${customer.name},

Thank you for choosing ${tenant.businessName}! We hope you had a great experience with us.

We'd love to see you again. Feel free to book your next appointment anytime.

If you have any feedback or questions, please don't hesitate to reach out.

Best regards,
${tenant.businessName}
    `.trim();

    return { subject, html, text };
  }

  /**
   * Generate reschedule notification email template
   */
  private generateRescheduleTemplate(data: AppointmentEmailData): EmailTemplate {
    const { appointment, customer, service, staff, tenant, rescheduleLink } = data;
    const appointmentTime = this.formatAppointmentTime(appointment, appointment.customerTimezone);

    const subject = `Appointment Rescheduled - ${service.name}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${tenant.primaryColor || '#4F46E5'}; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; color: #6b7280; }
            .value { color: #111827; }
            .button { display: inline-block; background-color: ${tenant.primaryColor || '#4F46E5'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Rescheduled</h1>
            </div>
            <div class="content">
              <p>Hi ${customer.name},</p>
              <p>Your appointment has been rescheduled to a new time.</p>
              
              <div class="details">
                <h2>Updated Appointment Details</h2>
                <div class="detail-row">
                  <span class="label">Service:</span>
                  <span class="value">${service.name}</span>
                </div>
                <div class="detail-row">
                  <span class="label">New Date & Time:</span>
                  <span class="value">${appointmentTime}</span>
                </div>
                ${
                  staff
                    ? `
                <div class="detail-row">
                  <span class="label">Staff Member:</span>
                  <span class="value">${staff.name}</span>
                </div>
                `
                    : ''
                }
                <div class="detail-row">
                  <span class="label">Duration:</span>
                  <span class="value">${service.durationMinutes} minutes</span>
                </div>
              </div>

              ${
                rescheduleLink
                  ? `
              <p>Need to reschedule again? Click the button below:</p>
              <a href="${rescheduleLink}" class="button">Reschedule Appointment</a>
              `
                  : ''
              }

              <p>We look forward to seeing you at the new time!</p>
              <p>Best regards,<br>${tenant.businessName}</p>
            </div>
            <div class="footer">
              <p>This is an automated message from ${tenant.businessName}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Appointment Rescheduled

Hi ${customer.name},

Your appointment has been rescheduled to a new time.

Updated Appointment Details:
- Service: ${service.name}
- New Date & Time: ${appointmentTime}
${staff ? `- Staff Member: ${staff.name}` : ''}
- Duration: ${service.durationMinutes} minutes

${rescheduleLink ? `Need to reschedule again? Visit: ${rescheduleLink}` : ''}

We look forward to seeing you at the new time!

Best regards,
${tenant.businessName}
    `.trim();

    return { subject, html, text };
  }

  /**
   * Generate cancellation notification email template
   */
  private generateCancellationTemplate(data: AppointmentEmailData): EmailTemplate {
    const { appointment, customer, service, tenant } = data;
    const appointmentTime = this.formatAppointmentTime(appointment, appointment.customerTimezone);

    const subject = `Appointment Cancelled - ${service.name}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; color: #6b7280; }
            .value { color: #111827; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Cancelled</h1>
            </div>
            <div class="content">
              <p>Hi ${customer.name},</p>
              <p>Your appointment has been cancelled.</p>
              
              <div class="details">
                <h2>Cancelled Appointment Details</h2>
                <div class="detail-row">
                  <span class="label">Service:</span>
                  <span class="value">${service.name}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Date & Time:</span>
                  <span class="value">${appointmentTime}</span>
                </div>
              </div>

              <p>We hope to see you again soon. Feel free to book a new appointment anytime.</p>
              <p>Best regards,<br>${tenant.businessName}</p>
            </div>
            <div class="footer">
              <p>This is an automated message from ${tenant.businessName}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Appointment Cancelled

Hi ${customer.name},

Your appointment has been cancelled.

Cancelled Appointment Details:
- Service: ${service.name}
- Date & Time: ${appointmentTime}

We hope to see you again soon. Feel free to book a new appointment anytime.

Best regards,
${tenant.businessName}
    `.trim();

    return { subject, html, text };
  }

  /**
   * Generate no-show rebooking reminder email template
   */
  private generateNoShowReminderTemplate(data: AppointmentEmailData): EmailTemplate {
    const { customer, service, tenant } = data;

    const subject = `We Missed You - ${service.name}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${tenant.primaryColor || '#4F46E5'}; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>We Missed You</h1>
            </div>
            <div class="content">
              <p>Hi ${customer.name},</p>
              <p>We noticed you weren't able to make it to your recent appointment for ${service.name}.</p>
              <p>We understand that things come up! We'd love to see you again and would be happy to help you reschedule.</p>
              <p>Feel free to book a new appointment at your convenience.</p>
              <p>Best regards,<br>${tenant.businessName}</p>
            </div>
            <div class="footer">
              <p>This is an automated message from ${tenant.businessName}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
We Missed You

Hi ${customer.name},

We noticed you weren't able to make it to your recent appointment for ${service.name}.

We understand that things come up! We'd love to see you again and would be happy to help you reschedule.

Feel free to book a new appointment at your convenience.

Best regards,
${tenant.businessName}
    `.trim();

    return { subject, html, text };
  }

  /**
   * Public API methods
   */

  async sendConfirmation(data: AppointmentEmailData, calendarInvite?: Buffer): Promise<void> {
    const template = this.generateConfirmationTemplate(data);
    const attachments = calendarInvite
      ? [
          {
            filename: 'appointment.ics',
            content: calendarInvite,
            contentType: 'text/calendar',
          },
        ]
      : undefined;

    await this.sendWithRetry(
      data.customer.email,
      template.subject,
      template.html,
      template.text,
      attachments
    );
  }

  async sendReminder(data: AppointmentEmailData): Promise<void> {
    const template = this.generateReminderTemplate(data);
    await this.sendWithRetry(data.customer.email, template.subject, template.html, template.text);
  }

  async sendFollowUp(data: AppointmentEmailData): Promise<void> {
    const template = this.generateFollowUpTemplate(data);
    await this.sendWithRetry(data.customer.email, template.subject, template.html, template.text);
  }

  async sendRescheduleNotification(
    data: AppointmentEmailData,
    calendarInvite?: Buffer
  ): Promise<void> {
    const template = this.generateRescheduleTemplate(data);
    const attachments = calendarInvite
      ? [
          {
            filename: 'appointment.ics',
            content: calendarInvite,
            contentType: 'text/calendar',
          },
        ]
      : undefined;

    await this.sendWithRetry(
      data.customer.email,
      template.subject,
      template.html,
      template.text,
      attachments
    );
  }

  async sendCancellation(data: AppointmentEmailData): Promise<void> {
    const template = this.generateCancellationTemplate(data);
    await this.sendWithRetry(data.customer.email, template.subject, template.html, template.text);
  }

  async sendNoShowReminder(data: AppointmentEmailData): Promise<void> {
    const template = this.generateNoShowReminderTemplate(data);
    await this.sendWithRetry(data.customer.email, template.subject, template.html, template.text);
  }
}

export default new EmailService();
export { AppointmentEmailData };
