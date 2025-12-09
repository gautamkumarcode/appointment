import { isValid, parseISO } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

/**
 * List of valid IANA timezone identifiers
 * This is a subset of commonly used timezones. For production, consider using
 * a complete list from a library like 'countries-and-timezones'
 */
const VALID_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'America/Buenos_Aires',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Madrid',
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Vienna',
  'Europe/Stockholm',
  'Europe/Warsaw',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Mumbai',
  'Asia/Delhi',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Pacific/Auckland',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Nairobi',
];

/**
 * Validates if a timezone string is a valid IANA timezone identifier
 * @param timezone - The timezone string to validate
 * @returns true if valid, false otherwise
 */
export function isValidTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== 'string') {
    return false;
  }

  // Check if timezone is in our list of valid timezones
  if (VALID_TIMEZONES.includes(timezone)) {
    return true;
  }

  // Additional validation: try to use the timezone with Intl.DateTimeFormat
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Converts a date from any timezone to UTC
 * This ensures all dates are stored in UTC in the database
 * @param date - The date to convert (can be Date object or ISO string)
 * @param timezone - The source timezone (IANA identifier)
 * @returns Date object in UTC
 */
export function toUTC(date: Date | string, timezone: string): Date {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) {
    throw new Error('Invalid date provided');
  }

  // Convert from the specified timezone to UTC
  // fromZonedTime treats the input date as if it's in the specified timezone
  // and returns the equivalent UTC date
  return fromZonedTime(dateObj, timezone);
}

/**
 * Converts a UTC date to a specific timezone
 * Used for displaying dates to users in their local timezone
 * @param utcDate - The UTC date to convert (can be Date object or ISO string)
 * @param timezone - The target timezone (IANA identifier)
 * @returns Date object in the target timezone
 */
export function fromUTC(utcDate: Date | string, timezone: string): Date {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  const dateObj = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;

  if (!isValid(dateObj)) {
    throw new Error('Invalid date provided');
  }

  // Convert from UTC to the specified timezone
  return toZonedTime(dateObj, timezone);
}

/**
 * Formats a UTC date in a specific timezone
 * @param utcDate - The UTC date to format
 * @param timezone - The target timezone (IANA identifier)
 * @param formatString - The format string (date-fns format)
 * @returns Formatted date string in the target timezone
 */
export function formatInTimezone(
  utcDate: Date | string,
  timezone: string,
  formatString: string = 'yyyy-MM-dd HH:mm:ss zzz'
): string {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  const dateObj = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;

  if (!isValid(dateObj)) {
    throw new Error('Invalid date provided');
  }

  return formatInTimeZone(dateObj, timezone, formatString);
}

/**
 * Gets the current date/time in UTC
 * @returns Current date in UTC
 */
export function nowUTC(): Date {
  return new Date();
}

/**
 * Converts a date to ISO string in UTC
 * @param date - The date to convert
 * @returns ISO string in UTC format
 */
export function toISOStringUTC(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) {
    throw new Error('Invalid date provided');
  }

  return dateObj.toISOString();
}

/**
 * Detects timezone from browser (for frontend use)
 * This function should be called on the client side
 * @returns The detected IANA timezone identifier
 */
export function detectBrowserTimezone(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (isValidTimezone(timezone)) {
      return timezone;
    }
    // Fallback to UTC if detection fails
    return 'UTC';
  } catch (error) {
    // Fallback to UTC if detection fails
    return 'UTC';
  }
}

/**
 * Gets timezone offset in minutes for a specific timezone at a given date
 * @param date - The date to check
 * @param timezone - The timezone (IANA identifier)
 * @returns Offset in minutes
 */
export function getTimezoneOffset(date: Date, timezone: string): number {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));

  return (utcDate.getTime() - tzDate.getTime()) / (1000 * 60);
}

/**
 * Checks if two dates represent the same moment in time
 * regardless of timezone representation
 * @param date1 - First date
 * @param date2 - Second date
 * @returns true if dates represent the same moment
 */
export function isSameMoment(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;

  if (!isValid(d1) || !isValid(d2)) {
    return false;
  }

  return d1.getTime() === d2.getTime();
}

/**
 * Validates that a date is stored in UTC
 * Checks if the date's timezone offset is 0
 * @param date - The date to validate
 * @returns true if date is in UTC
 */
export function isUTC(date: Date): boolean {
  return date.getTimezoneOffset() === 0;
}

export default {
  isValidTimezone,
  toUTC,
  fromUTC,
  formatInTimezone,
  nowUTC,
  toISOStringUTC,
  detectBrowserTimezone,
  getTimezoneOffset,
  isSameMoment,
  isUTC,
};
