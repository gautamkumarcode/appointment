/**
 * Example usage of timezone utilities
 * This file demonstrates how to use the timezone functions in the application
 */

import {
  detectBrowserTimezone,
  formatInTimezone,
  fromUTC,
  isValidTimezone,
  toUTC,
} from './timezone';

// Example 1: Storing an appointment time in UTC
// When a customer books an appointment at "2024-06-15 2:00 PM" in their timezone
function storeAppointmentExample() {
  const customerTimezone = 'America/New_York';
  const appointmentTime = new Date('2024-06-15T14:00:00'); // 2:00 PM local time

  // Convert to UTC before storing in database
  const utcTime = toUTC(appointmentTime, customerTimezone);

  console.log('Customer selected:', appointmentTime);
  console.log('Stored in DB (UTC):', utcTime.toISOString());
  // Output: 2024-06-15T18:00:00.000Z (2 PM EST = 6 PM UTC)

  return utcTime;
}

// Example 2: Displaying an appointment to a customer
// When showing an appointment to a customer in their timezone
function displayAppointmentExample() {
  // Retrieve from database (always in UTC)
  const utcTime = new Date('2024-06-15T18:00:00Z');
  const customerTimezone = 'America/Los_Angeles';

  // Convert to customer's timezone for display
  const localTime = fromUTC(utcTime, customerTimezone);

  console.log('Stored in DB (UTC):', utcTime.toISOString());
  console.log('Display to customer:', localTime);
  // Output: 11:00 AM PST (6 PM UTC = 11 AM PST)

  return localTime;
}

// Example 3: Formatting appointment times for display
function formatAppointmentExample() {
  const utcTime = new Date('2024-06-15T18:00:00Z');
  const customerTimezone = 'Asia/Tokyo';

  // Format in customer's timezone
  const formatted = formatInTimezone(
    utcTime,
    customerTimezone,
    "EEEE, MMMM d, yyyy 'at' h:mm a zzz"
  );

  console.log('Formatted:', formatted);
  // Output: "Saturday, June 15, 2024 at 3:00 AM JST"

  return formatted;
}

// Example 4: Validating timezone input
function validateTimezoneExample(timezone: string) {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  console.log(`${timezone} is valid`);
  return true;
}

// Example 5: Detecting browser timezone (frontend)
function detectTimezoneExample() {
  const timezone = detectBrowserTimezone();
  console.log('Detected timezone:', timezone);
  // Output: "America/New_York" (or whatever the user's timezone is)

  return timezone;
}

// Example 6: Complete booking flow
function completeBookingFlowExample() {
  // Step 1: Customer selects a time in their timezone
  const customerTimezone = 'Europe/London';
  const selectedTime = new Date('2024-06-15T14:00:00'); // 2:00 PM London time

  // Step 2: Convert to UTC for storage
  const utcTime = toUTC(selectedTime, customerTimezone);

  // Step 3: Store in database
  console.log('Storing in database:', utcTime.toISOString());

  // Step 4: Later, retrieve and display to business owner in their timezone
  const businessTimezone = 'America/New_York';
  const businessLocalTime = fromUTC(utcTime, businessTimezone);

  console.log(
    'Business owner sees:',
    formatInTimezone(utcTime, businessTimezone, 'MMM d, yyyy h:mm a zzz')
  );

  // Step 5: Send confirmation email to customer in their timezone
  const confirmationTime = formatInTimezone(
    utcTime,
    customerTimezone,
    "EEEE, MMMM d, yyyy 'at' h:mm a zzz"
  );

  console.log('Customer confirmation:', confirmationTime);

  return {
    utcTime,
    businessLocalTime,
    confirmationTime,
  };
}

// Export examples for testing
export {
  completeBookingFlowExample,
  detectTimezoneExample,
  displayAppointmentExample,
  formatAppointmentExample,
  storeAppointmentExample,
  validateTimezoneExample,
};
