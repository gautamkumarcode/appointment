import ical, { ICalCalendar } from 'ical-generator';
import { IAppointment } from '../models/Appointment';
import { ICustomer } from '../models/Customer';
import { IService } from '../models/Service';
import { IStaff } from '../models/Staff';
import { ITenant } from '../models/Tenant';
import { logger } from '../utils/logger';

interface CalendarInviteData {
  appointment: IAppointment;
  customer: ICustomer;
  service: IService;
  staff?: IStaff;
  tenant: ITenant;
}

class CalendarService {
  /**
   * Generate .ics calendar file for an appointment
   * Includes all appointment details and timezone information
   */
  generateCalendarInvite(data: CalendarInviteData): Buffer {
    const { appointment, customer, service, staff, tenant } = data;

    try {
      // Create calendar
      const calendar: ICalCalendar = ical({
        name: `${tenant.businessName} - Appointment`,
        prodId: {
          company: tenant.businessName,
          product: 'AI Appointment Scheduler',
        },
        timezone: appointment.customerTimezone,
      });

      // Build event description
      let description = `Appointment for ${service.name}\n\n`;
      description += `Service: ${service.name}\n`;
      description += `Duration: ${service.durationMinutes} minutes\n`;
      if (staff) {
        description += `Staff Member: ${staff.name}\n`;
        if (staff.email) {
          description += `Staff Email: ${staff.email}\n`;
        }
      }
      if (appointment.notes) {
        description += `\nNotes: ${appointment.notes}\n`;
      }
      description += `\nBooked with ${tenant.businessName}`;

      // Build event location
      let location = tenant.businessName;
      if (tenant.phone) {
        location += ` - ${tenant.phone}`;
      }

      // Create event
      const event = calendar.createEvent({
        start: appointment.startTime,
        end: appointment.endTime,
        summary: `${service.name} - ${tenant.businessName}`,
        description: description,
        location: location,
        organizer: {
          name: tenant.businessName,
          email: tenant.email,
        },
        url: process.env.FRONTEND_URL
          ? `${process.env.FRONTEND_URL}/appointments/${appointment._id}`
          : undefined,
      });

      // Add customer as attendee
      event.createAttendee({
        name: customer.name,
        email: customer.email,
      });

      // Add staff as attendee if present
      if (staff && staff.email) {
        event.createAttendee({
          name: staff.name,
          email: staff.email,
        });
      }

      // Generate .ics file as buffer
      const icsContent = calendar.toString();
      const buffer = Buffer.from(icsContent, 'utf-8');

      logger.info('Calendar invite generated successfully', {
        appointmentId: appointment._id,
        customerEmail: customer.email,
      });

      return buffer;
    } catch (error) {
      logger.error('Failed to generate calendar invite', {
        appointmentId: appointment._id,
        error: (error as Error).message,
      });
      throw new Error(`Failed to generate calendar invite: ${(error as Error).message}`);
    }
  }

  /**
   * Generate calendar invite for a cancelled appointment
   * This creates a cancellation notice that will remove the event from calendars
   */
  generateCancellationInvite(data: CalendarInviteData): Buffer {
    const { appointment, customer, service, tenant } = data;

    try {
      // Create calendar
      const calendar: ICalCalendar = ical({
        name: `${tenant.businessName} - Appointment Cancelled`,
        prodId: {
          company: tenant.businessName,
          product: 'AI Appointment Scheduler',
        },
        timezone: appointment.customerTimezone,
      });

      // Create cancellation event
      const event = calendar.createEvent({
        start: appointment.startTime,
        end: appointment.endTime,
        summary: `CANCELLED: ${service.name} - ${tenant.businessName}`,
        description: `This appointment has been cancelled.\n\nOriginal Service: ${service.name}\n\n${tenant.businessName}`,
        location: tenant.businessName,
        organizer: {
          name: tenant.businessName,
          email: tenant.email,
        },
      });

      // Add customer as attendee
      event.createAttendee({
        name: customer.name,
        email: customer.email,
      });

      const icsContent = calendar.toString();
      const buffer = Buffer.from(icsContent, 'utf-8');

      logger.info('Cancellation calendar invite generated successfully', {
        appointmentId: appointment._id,
        customerEmail: customer.email,
      });

      return buffer;
    } catch (error) {
      logger.error('Failed to generate cancellation calendar invite', {
        appointmentId: appointment._id,
        error: (error as Error).message,
      });
      throw new Error(`Failed to generate cancellation invite: ${(error as Error).message}`);
    }
  }
}

export default new CalendarService();
export { CalendarInviteData };
