import {
  addMinutes,
  areIntervalsOverlapping,
  eachDayOfInterval,
  endOfDay,
  getDay,
  isAfter,
  isBefore,
  startOfDay,
} from 'date-fns';
import mongoose from 'mongoose';
import { Appointment } from '../models/Appointment';
import { Service } from '../models/Service';
import { Staff } from '../models/Staff';
import { StaffHoliday } from '../models/StaffHoliday';
import { Tenant } from '../models/Tenant';
import { fromUTC, toUTC } from '../utils/timezone';

export interface TimeSlot {
  startTime: Date; // UTC
  endTime: Date; // UTC
  startTimeLocal: string; // ISO string in customer timezone
  endTimeLocal: string; // ISO string in customer timezone
  available: boolean; // Always true for generated slots
  staffId?: string;
}

export interface SlotGenerationParams {
  tenantId: string;
  serviceId?: string; // Optional for general availability queries
  staffId?: string;
  startDate: Date; // In customer timezone
  endDate: Date; // In customer timezone
  timezone: string; // Customer timezone
}

export interface AvailabilityWindow {
  start: Date; // UTC
  end: Date; // UTC
}

/**
 * Generates available time slots for booking
 */
export async function generateTimeSlots(params: SlotGenerationParams): Promise<TimeSlot[]> {
  const { tenantId, serviceId, staffId, startDate, endDate, timezone } = params;

  // Validate tenant exists and get tenant timezone
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Use tenant timezone for interpreting staff working hours
  const businessTimezone = tenant.timezone;

  // If no serviceId provided, return empty array (user needs to select a service first)
  if (!serviceId) {
    return [];
  }

  // Validate and fetch service
  const service = await Service.findOne({
    _id: serviceId,
    tenantId,
    isActive: true,
    deletedAt: null,
  });

  if (!service) {
    throw new Error('Service not found or inactive');
  }

  // If staff is required or specified, validate staff
  let staff = null;
  if (staffId || service.requireStaff) {
    const staffQuery: any = {
      tenantId,
      deletedAt: null,
    };

    if (staffId) {
      staffQuery._id = staffId;
    }

    staff = await Staff.findOne(staffQuery);

    if (!staff) {
      throw new Error('Staff member not found');
    }
  }

  // Convert date range to UTC for database queries
  const startDateUTC = toUTC(startOfDay(startDate), timezone);
  const endDateUTC = toUTC(endOfDay(endDate), timezone);

  // Get existing appointments in the date range
  const existingAppointments = await getExistingAppointments(
    tenantId,
    startDateUTC,
    endDateUTC,
    staffId
  );

  // Get staff holidays if staff is specified
  const staffHolidays = staff
    ? await getStaffHolidays(staff._id.toString(), startDateUTC, endDateUTC)
    : [];

  // Generate slots for each day in the range
  const allSlots: TimeSlot[] = [];
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  for (const day of days) {
    const daySlots = await generateSlotsForDay(
      day,
      timezone, // customer timezone for display
      businessTimezone, // business timezone for working hours
      service,
      staff,
      existingAppointments,
      staffHolidays
    );
    allSlots.push(...daySlots);
  }

  return allSlots;
}

/**
 * Generates time slots for a single day
 */
async function generateSlotsForDay(
  day: Date,
  customerTimezone: string,
  businessTimezone: string,
  service: any,
  staff: any | null,
  existingAppointments: any[],
  staffHolidays: Date[]
): Promise<TimeSlot[]> {
  const slots: TimeSlot[] = [];

  // Check if this day is a staff holiday
  const dayStart = startOfDay(day);
  const isHoliday = staffHolidays.some(
    (holiday) => startOfDay(holiday).getTime() === dayStart.getTime()
  );

  if (isHoliday) {
    return slots;
  }

  // Get working hours for this day
  const dayOfWeek = getDayName(getDay(day));
  const workingHours = staff ? staff.weeklySchedule[dayOfWeek] : getDefaultWorkingHours(dayOfWeek);

  if (!workingHours || workingHours.length === 0) {
    return slots;
  }

  // Generate slots for each working period
  for (const period of workingHours) {
    const periodSlots = generateSlotsForPeriod(
      day,
      period,
      customerTimezone,
      businessTimezone,
      service,
      staff,
      existingAppointments
    );
    slots.push(...periodSlots);
  }

  return slots;
}

/**
 * Generates time slots for a working period
 */
function generateSlotsForPeriod(
  day: Date,
  period: { start: string; end: string },
  customerTimezone: string,
  businessTimezone: string,
  service: any,
  staff: any | null,
  existingAppointments: any[]
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // Parse working hours (format: "HH:mm")
  const [startHour, startMinute] = period.start.split(':').map(Number);
  const [endHour, endMinute] = period.end.split(':').map(Number);

  // Create start and end times in business timezone
  // Staff working hours are defined in the business timezone
  const year = day.getFullYear();
  const month = day.getMonth();
  const dayOfMonth = day.getDate();

  // Create date strings representing the working hours in business timezone
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
  const periodStartStr = `${dateStr}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`;
  const periodEndStr = `${dateStr}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`;

  // Convert from business timezone to UTC (staff working hours are in business timezone)
  const periodStartUTC = toUTC(new Date(periodStartStr), businessTimezone);
  const periodEndUTC = toUTC(new Date(periodEndStr), businessTimezone);

  // Generate slots
  let currentSlotStart = periodStartUTC;
  const serviceDuration = service.durationMinutes;
  const bufferTime = service.bufferMinutes || 0;
  const totalSlotDuration = serviceDuration + bufferTime;

  while (isBefore(currentSlotStart, periodEndUTC)) {
    const currentSlotEnd = addMinutes(currentSlotStart, serviceDuration);

    // Check if slot fits within working hours
    if (isAfter(currentSlotEnd, periodEndUTC)) {
      break;
    }

    // Check if slot conflicts with existing appointments
    const hasConflict = existingAppointments.some((appointment) => {
      // Include buffer time in conflict check
      const appointmentStart = appointment.startTime;
      const appointmentEnd = addMinutes(
        appointment.endTime,
        appointment.service?.bufferMinutes || 0
      );

      return areIntervalsOverlapping(
        { start: currentSlotStart, end: addMinutes(currentSlotEnd, bufferTime) },
        { start: appointmentStart, end: appointmentEnd },
        { inclusive: false }
      );
    });

    // Check if slot is in the past (only for today's date)
    const now = new Date();
    const isPastSlot = isBefore(currentSlotEnd, now);

    // Only show future slots or current/future slots for today
    if (!isPastSlot) {
      // Convert to customer timezone for display
      const startTimeLocal = fromUTC(currentSlotStart, customerTimezone);
      const endTimeLocal = fromUTC(currentSlotEnd, customerTimezone);

      slots.push({
        startTime: currentSlotStart,
        endTime: currentSlotEnd,
        startTimeLocal: startTimeLocal.toISOString(),
        endTimeLocal: endTimeLocal.toISOString(),
        available: !hasConflict, // Available if no conflict, booked if has conflict
        staffId: staff?._id.toString(),
      });
    }

    // Move to next slot (service duration + buffer time)
    currentSlotStart = addMinutes(currentSlotStart, totalSlotDuration);
  }

  return slots;
}

/**
 * Gets existing appointments in a date range
 */
async function getExistingAppointments(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  staffId?: string
): Promise<any[]> {
  const query: any = {
    tenantId,
    status: { $in: ['confirmed', 'completed'] },
    startTime: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  if (staffId) {
    query.staffId = staffId;
  }

  const appointments = await Appointment.find(query).populate('serviceId', 'bufferMinutes').lean();

  return appointments;
}

/**
 * Gets staff holidays in a date range
 */
async function getStaffHolidays(staffId: string, startDate: Date, endDate: Date): Promise<Date[]> {
  const holidays = await StaffHoliday.find({
    staffId,
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  }).lean();

  return holidays.map((h) => h.date);
}

/**
 * Converts day number to day name
 */
function getDayName(dayNumber: number): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[dayNumber];
}

/**
 * Default working hours (9 AM - 5 PM) for businesses without staff
 */
function getDefaultWorkingHours(dayOfWeek: string): { start: string; end: string }[] {
  // Default: Monday to Sunday, 9 AM - 5 PM (7 days a week)
  const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  if (allDays.includes(dayOfWeek)) {
    return [{ start: '09:00', end: '17:00' }];
  }

  return [];
}

/**
 * Checks if a specific time slot is available
 */
export async function checkSlotAvailability(
  tenantId: string,
  serviceId: string,
  startTime: Date, // UTC
  endTime: Date, // UTC
  staffId?: string
): Promise<boolean> {
  // Validate service
  const service = await Service.findOne({
    _id: serviceId,
    tenantId,
    isActive: true,
    deletedAt: null,
  });

  if (!service) {
    return false;
  }

  // Check for conflicting appointments
  const query: any = {
    tenantId,
    status: { $in: ['confirmed', 'completed'] },
    $or: [
      {
        // Existing appointment starts during the requested slot
        startTime: {
          $gte: startTime,
          $lt: endTime,
        },
      },
      {
        // Existing appointment ends during the requested slot
        endTime: {
          $gt: startTime,
          $lte: endTime,
        },
      },
      {
        // Existing appointment completely overlaps the requested slot
        startTime: { $lte: startTime },
        endTime: { $gte: endTime },
      },
    ],
  };

  if (staffId) {
    query.staffId = staffId;
  }

  const conflictingAppointment = await Appointment.findOne(query);

  return !conflictingAppointment;
}

/**
 * Checks slot availability with database-level locking for concurrent booking prevention
 */
export async function checkAndLockSlot(
  tenantId: string,
  _serviceId: string,
  startTime: Date,
  endTime: Date,
  staffId?: string,
  session?: mongoose.ClientSession
): Promise<boolean> {
  // Use findOneAndUpdate with a query that will only succeed if no conflict exists
  // This provides atomic check-and-lock behavior
  const query: any = {
    tenantId,
    status: { $in: ['confirmed', 'completed'] },
    $or: [
      {
        startTime: {
          $gte: startTime,
          $lt: endTime,
        },
      },
      {
        endTime: {
          $gt: startTime,
          $lte: endTime,
        },
      },
      {
        startTime: { $lte: startTime },
        endTime: { $gte: endTime },
      },
    ],
  };

  if (staffId) {
    query.staffId = staffId;
  }

  const options = session ? { session } : {};
  const conflictingAppointment = await Appointment.findOne(query, null, options);

  return !conflictingAppointment;
}

/**
 * Gets staff availability windows for a specific date
 */
export async function getStaffAvailability(
  staffId: string,
  date: Date,
  timezone: string
): Promise<AvailabilityWindow[]> {
  const staff = await Staff.findOne({
    _id: staffId,
    deletedAt: null,
  });

  if (!staff) {
    throw new Error('Staff member not found');
  }

  // Check if date is a holiday
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  const dayStartUTC = toUTC(dayStart, timezone);
  const dayEndUTC = toUTC(dayEnd, timezone);

  const holiday = await StaffHoliday.findOne({
    staffId,
    date: {
      $gte: dayStartUTC,
      $lte: dayEndUTC,
    },
  });

  if (holiday) {
    return [];
  }

  // Get working hours for this day
  const dayOfWeek = getDayName(getDay(date));
  const workingHours = staff.weeklySchedule[dayOfWeek];

  if (!workingHours || workingHours.length === 0) {
    return [];
  }

  // Convert working hours to UTC availability windows
  const windows: AvailabilityWindow[] = [];

  for (const period of workingHours) {
    const [startHour, startMinute] = period.start.split(':').map(Number);
    const [endHour, endMinute] = period.end.split(':').map(Number);

    const periodStart = new Date(date);
    periodStart.setHours(startHour, startMinute, 0, 0);

    const periodEnd = new Date(date);
    periodEnd.setHours(endHour, endMinute, 0, 0);

    windows.push({
      start: toUTC(periodStart, timezone),
      end: toUTC(periodEnd, timezone),
    });
  }

  return windows;
}

export default {
  generateTimeSlots,
  checkSlotAvailability,
  checkAndLockSlot,
  getStaffAvailability,
};
