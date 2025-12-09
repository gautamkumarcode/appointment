/**
 * Frontend timezone utilities for browser-based timezone detection and display
 */

/**
 * Detects the user's timezone from their browser
 * This uses the Intl API which is supported in all modern browsers
 * @returns The detected IANA timezone identifier (e.g., 'America/New_York')
 */
export function detectBrowserTimezone(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone && isValidTimezone(timezone)) {
      return timezone;
    }
    // Fallback to UTC if detection fails
    return 'UTC';
  } catch (error) {
    console.error('Failed to detect browser timezone:', error);
    // Fallback to UTC if detection fails
    return 'UTC';
  }
}

/**
 * Validates if a timezone string is a valid IANA timezone identifier
 * @param timezone - The timezone string to validate
 * @returns true if valid, false otherwise
 */
export function isValidTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== 'string') {
    return false;
  }

  try {
    // Try to use the timezone with Intl.DateTimeFormat
    // This will throw if the timezone is invalid
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Formats a date in a specific timezone
 * @param date - The date to format (Date object or ISO string)
 * @param timezone - The target timezone (IANA identifier)
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string
 */
export function formatInTimezone(
  date: Date | string,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided');
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
    timeZoneName: 'short',
  };

  return new Intl.DateTimeFormat('en-US', {
    ...defaultOptions,
    ...options,
  }).format(dateObj);
}

/**
 * Gets the timezone abbreviation (e.g., 'EST', 'PST')
 * @param timezone - The timezone (IANA identifier)
 * @param date - Optional date to check (for DST variations)
 * @returns Timezone abbreviation
 */
export function getTimezoneAbbreviation(timezone: string, date: Date = new Date()): string {
  if (!isValidTimezone(timezone)) {
    return '';
  }

  try {
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).format(date);

    // Extract the timezone abbreviation from the formatted string
    const match = formatted.match(/\b[A-Z]{3,5}\b/);
    return match ? match[0] : '';
  } catch (error) {
    return '';
  }
}

/**
 * Gets the UTC offset for a timezone at a specific date
 * @param timezone - The timezone (IANA identifier)
 * @param date - The date to check (for DST variations)
 * @returns Offset string (e.g., '+05:30', '-08:00')
 */
export function getTimezoneOffset(timezone: string, date: Date = new Date()): string {
  if (!isValidTimezone(timezone)) {
    return '+00:00';
  }

  try {
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    }).format(date);

    // Extract offset from formatted string (e.g., "GMT+05:30")
    const match = formatted.match(/GMT([+-]\d{2}:\d{2})/);
    return match ? match[1] : '+00:00';
  } catch (error) {
    return '+00:00';
  }
}

/**
 * Stores the detected timezone in localStorage
 * This can be used to persist the user's timezone preference
 * @param timezone - The timezone to store
 */
export function storeTimezone(timezone: string): void {
  if (typeof window !== 'undefined' && isValidTimezone(timezone)) {
    try {
      localStorage.setItem('userTimezone', timezone);
    } catch (error) {
      console.error('Failed to store timezone in localStorage:', error);
    }
  }
}

/**
 * Retrieves the stored timezone from localStorage
 * Falls back to browser detection if not stored
 * @returns The stored or detected timezone
 */
export function getStoredTimezone(): string {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('userTimezone');
      if (stored && isValidTimezone(stored)) {
        return stored;
      }
    } catch (error) {
      console.error('Failed to retrieve timezone from localStorage:', error);
    }
  }
  return detectBrowserTimezone();
}

/**
 * Converts a UTC date string to a Date object
 * @param utcString - ISO string in UTC
 * @returns Date object
 */
export function parseUTCString(utcString: string): Date {
  const date = new Date(utcString);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid UTC date string');
  }
  return date;
}

/**
 * Formats a date for display in the user's timezone
 * Uses the stored/detected timezone automatically
 * @param date - The date to format (Date object or ISO string)
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string
 */
export function formatInUserTimezone(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const timezone = getStoredTimezone();
  return formatInTimezone(date, timezone, options);
}

export default {
  detectBrowserTimezone,
  isValidTimezone,
  formatInTimezone,
  getTimezoneAbbreviation,
  getTimezoneOffset,
  storeTimezone,
  getStoredTimezone,
  parseUTCString,
  formatInUserTimezone,
};
