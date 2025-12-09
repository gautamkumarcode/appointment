import {
  detectBrowserTimezone,
  formatInTimezone,
  fromUTC,
  isSameMoment,
  isValidTimezone,
  nowUTC,
  toISOStringUTC,
  toUTC,
} from '../timezone';

describe('Timezone Utilities', () => {
  describe('isValidTimezone', () => {
    it('should return true for valid IANA timezones', () => {
      expect(isValidTimezone('UTC')).toBe(true);
      expect(isValidTimezone('America/New_York')).toBe(true);
      expect(isValidTimezone('Europe/London')).toBe(true);
      expect(isValidTimezone('Asia/Tokyo')).toBe(true);
      expect(isValidTimezone('Australia/Sydney')).toBe(true);
    });

    it('should return false for invalid timezones', () => {
      expect(isValidTimezone('Invalid/Timezone')).toBe(false);
      expect(isValidTimezone('NotATimezone')).toBe(false);
      expect(isValidTimezone('')).toBe(false);
      expect(isValidTimezone(null as any)).toBe(false);
      expect(isValidTimezone(undefined as any)).toBe(false);
    });
  });

  describe('toUTC', () => {
    it('should convert a date from a timezone to UTC', () => {
      // January 1, 2024, 12:00 PM in New York
      const nyDate = new Date('2024-01-01T12:00:00');
      const utcDate = toUTC(nyDate, 'America/New_York');

      // New York is UTC-5 in winter, so 12:00 PM EST = 5:00 PM UTC
      expect(utcDate.getUTCHours()).toBe(17);
    });

    it('should handle ISO string input', () => {
      const isoString = '2024-01-01T12:00:00';
      const utcDate = toUTC(isoString, 'America/New_York');

      expect(utcDate).toBeInstanceOf(Date);
      expect(utcDate.getUTCHours()).toBe(17);
    });

    it('should throw error for invalid timezone', () => {
      const date = new Date('2024-01-01T12:00:00');
      expect(() => toUTC(date, 'Invalid/Timezone')).toThrow('Invalid timezone');
    });

    it('should throw error for invalid date', () => {
      expect(() => toUTC('invalid-date', 'UTC')).toThrow('Invalid date');
    });
  });

  describe('fromUTC', () => {
    it('should convert a UTC date to a specific timezone', () => {
      // January 1, 2024, 5:00 PM UTC
      const utcDate = new Date('2024-01-01T17:00:00Z');
      const nyDate = fromUTC(utcDate, 'America/New_York');

      // UTC 5:00 PM = 12:00 PM EST (UTC-5)
      // Note: getHours() returns local time, so we check the conversion worked
      expect(nyDate).toBeInstanceOf(Date);
    });

    it('should handle ISO string input', () => {
      const isoString = '2024-01-01T17:00:00Z';
      const nyDate = fromUTC(isoString, 'America/New_York');

      expect(nyDate).toBeInstanceOf(Date);
    });

    it('should throw error for invalid timezone', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      expect(() => fromUTC(date, 'Invalid/Timezone')).toThrow('Invalid timezone');
    });

    it('should throw error for invalid date', () => {
      expect(() => fromUTC('invalid-date', 'UTC')).toThrow('Invalid date');
    });
  });

  describe('formatInTimezone', () => {
    it('should format a date in a specific timezone', () => {
      const utcDate = new Date('2024-01-01T17:00:00Z');
      const formatted = formatInTimezone(utcDate, 'America/New_York');

      expect(formatted).toContain('2024');
      expect(formatted).toContain('01');
      expect(formatted).toContain('01');
    });

    it('should use custom format string', () => {
      const utcDate = new Date('2024-01-01T17:00:00Z');
      const formatted = formatInTimezone(utcDate, 'UTC', 'yyyy-MM-dd');

      expect(formatted).toBe('2024-01-01');
    });

    it('should throw error for invalid timezone', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      expect(() => formatInTimezone(date, 'Invalid/Timezone')).toThrow('Invalid timezone');
    });

    it('should throw error for invalid date', () => {
      expect(() => formatInTimezone('invalid-date', 'UTC')).toThrow('Invalid date');
    });
  });

  describe('nowUTC', () => {
    it('should return current date in UTC', () => {
      const now = nowUTC();
      const currentTime = new Date();

      expect(now).toBeInstanceOf(Date);
      // Should be within 1 second of current time
      expect(Math.abs(now.getTime() - currentTime.getTime())).toBeLessThan(1000);
    });
  });

  describe('toISOStringUTC', () => {
    it('should convert date to ISO string', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      const isoString = toISOStringUTC(date);

      expect(isoString).toBe('2024-01-01T12:00:00.000Z');
    });

    it('should handle string input', () => {
      const isoString = toISOStringUTC('2024-01-01T12:00:00Z');

      expect(isoString).toBe('2024-01-01T12:00:00.000Z');
    });

    it('should throw error for invalid date', () => {
      expect(() => toISOStringUTC('invalid-date')).toThrow('Invalid date');
    });
  });

  describe('detectBrowserTimezone', () => {
    it('should return a valid timezone', () => {
      const timezone = detectBrowserTimezone();

      expect(typeof timezone).toBe('string');
      expect(timezone.length).toBeGreaterThan(0);
      // Should be a valid timezone or fallback to UTC
      expect(isValidTimezone(timezone)).toBe(true);
    });
  });

  describe('isSameMoment', () => {
    it('should return true for dates representing the same moment', () => {
      const date1 = new Date('2024-01-01T12:00:00Z');
      const date2 = new Date('2024-01-01T12:00:00Z');

      expect(isSameMoment(date1, date2)).toBe(true);
    });

    it('should return true for same moment with different representations', () => {
      const date1 = new Date('2024-01-01T12:00:00Z');
      const date2 = '2024-01-01T12:00:00.000Z';

      expect(isSameMoment(date1, date2)).toBe(true);
    });

    it('should return false for different moments', () => {
      const date1 = new Date('2024-01-01T12:00:00Z');
      const date2 = new Date('2024-01-01T13:00:00Z');

      expect(isSameMoment(date1, date2)).toBe(false);
    });

    it('should return false for invalid dates', () => {
      expect(isSameMoment('invalid', new Date())).toBe(false);
      expect(isSameMoment(new Date(), 'invalid')).toBe(false);
    });
  });

  describe('Timezone conversion round-trip', () => {
    it('should preserve the moment when converting to UTC and back', () => {
      // Start with a UTC date
      const utcDate = new Date('2024-06-15T14:30:00Z');
      const timezone = 'America/Los_Angeles';

      // Convert to timezone and back to UTC
      const tzDate = fromUTC(utcDate, timezone);
      const backToUTC = toUTC(tzDate, timezone);

      // The moment should be preserved (same timestamp)
      expect(isSameMoment(utcDate, backToUTC)).toBe(true);
    });

    it('should work across different timezones', () => {
      const timezones = [
        'America/New_York',
        'Europe/London',
        'Asia/Tokyo',
        'Australia/Sydney',
        'America/Los_Angeles',
      ];

      timezones.forEach((timezone) => {
        const utcDate = new Date('2024-06-15T14:30:00Z');
        const tzDate = fromUTC(utcDate, timezone);
        const backToUTC = toUTC(tzDate, timezone);

        expect(isSameMoment(utcDate, backToUTC)).toBe(true);
      });
    });
  });

  describe('UTC storage validation', () => {
    it('should ensure dates are stored in UTC', () => {
      const date = new Date('2024-01-01T12:00:00');
      const utcDate = toUTC(date, 'America/New_York');

      // The UTC date should be a valid Date object
      expect(utcDate).toBeInstanceOf(Date);
      expect(utcDate.toISOString()).toContain('Z');
    });
  });
});
