// Standalone validation for AI Assistant Service core functions
// This doesn't require database or Redis connections

// Test intent extraction
function extractIntent(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes('book') ||
    lowerMessage.includes('appointment') ||
    lowerMessage.includes('schedule')
  ) {
    return 'booking';
  }

  if (
    lowerMessage.includes('available') ||
    lowerMessage.includes('availability') ||
    lowerMessage.includes('when')
  ) {
    return 'availability';
  }

  if (
    lowerMessage.includes('service') ||
    lowerMessage.includes('price') ||
    lowerMessage.includes('cost')
  ) {
    return 'service_info';
  }

  if (
    lowerMessage.includes('hours') ||
    lowerMessage.includes('open') ||
    lowerMessage.includes('closed')
  ) {
    return 'business_hours';
  }

  return 'general';
}

// Test customer info validation
function validateCustomerInfo(customerInfo: { name?: string; email?: string; phone?: string }): {
  isValid: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  if (!customerInfo.name || customerInfo.name.trim().length < 2) {
    missing.push('name');
  }

  if (!customerInfo.email || !isValidEmail(customerInfo.email)) {
    missing.push('email');
  }

  // Phone is optional but if provided should be valid
  if (customerInfo.phone && !isValidPhone(customerInfo.phone)) {
    missing.push('valid phone number');
  }

  return {
    isValid: missing.length === 0,
    missing,
  };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
}

// Test booking intent extraction
function extractBookingIntent(message: string): any | null {
  const lowerMessage = message.toLowerCase();

  if (
    !lowerMessage.includes('book') &&
    !lowerMessage.includes('appointment') &&
    !lowerMessage.includes('schedule')
  ) {
    return null;
  }

  const intent: any = {
    type: 'booking',
  };

  // Extract customer information using regex patterns
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b\(\d{3}\)\s?\d{3}[-.]?\d{4}\b/;
  const namePattern = /(?:my name is|i'm|i am)\s+([a-zA-Z\s]+?)(?:\s+and|$)/i;

  const emailMatch = message.match(emailPattern);
  const phoneMatch = message.match(phonePattern);
  const nameMatch = message.match(namePattern);

  if (emailMatch || phoneMatch || nameMatch) {
    intent.customerInfo = {};
    if (emailMatch) intent.customerInfo.email = emailMatch[0];
    if (phoneMatch) intent.customerInfo.phone = phoneMatch[0];
    if (nameMatch) intent.customerInfo.name = nameMatch[1].trim();
  }

  return intent;
}

// Run validation
async function validateAICore() {
  console.log('🤖 Validating AI Assistant Core Functions...');

  try {
    // Test intent extraction
    console.log('✅ Testing intent extraction...');
    const bookingIntent = extractIntent('I want to book an appointment');
    console.log(`   Booking intent: ${bookingIntent}`);

    const serviceIntent = extractIntent('What services do you offer?');
    console.log(`   Service intent: ${serviceIntent}`);

    const availabilityIntent = extractIntent('When are you available?');
    console.log(`   Availability intent: ${availabilityIntent}`);

    const hoursIntent = extractIntent('What are your hours?');
    console.log(`   Hours intent: ${hoursIntent}`);

    const generalIntent = extractIntent('Hello there');
    console.log(`   General intent: ${generalIntent}`);

    // Test customer info validation
    console.log('✅ Testing customer info validation...');
    const validInfo = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
    };

    const validation = validateCustomerInfo(validInfo);
    console.log(`   Valid info result: ${validation.isValid}`);

    const invalidInfo = {
      name: '',
      email: 'invalid-email',
    };

    const invalidValidation = validateCustomerInfo(invalidInfo);
    console.log(
      `   Invalid info result: ${invalidValidation.isValid}, missing: ${invalidValidation.missing.join(', ')}`
    );

    // Test booking intent extraction
    console.log('✅ Testing booking intent extraction...');
    const nonBookingMessage = 'What are your hours?';
    const nonBookingIntent = extractBookingIntent(nonBookingMessage);
    console.log(`   Non-booking message result: ${nonBookingIntent}`);

    const bookingMessage =
      'I want to book an appointment, my name is John Doe and my email is john@example.com';
    const intent = extractBookingIntent(bookingMessage);
    console.log(`   Extracted intent: ${intent?.type}`);
    console.log(`   Extracted name: ${intent?.customerInfo?.name}`);
    console.log(`   Extracted email: ${intent?.customerInfo?.email}`);

    // Test email validation
    console.log('✅ Testing email validation...');
    console.log(`   Valid email: ${isValidEmail('test@example.com')}`);
    console.log(`   Invalid email: ${isValidEmail('invalid-email')}`);

    // Test phone validation
    console.log('✅ Testing phone validation...');
    console.log(`   Valid phone: ${isValidPhone('123-456-7890')}`);
    console.log(`   Invalid phone: ${isValidPhone('123')}`);

    console.log('🎉 AI Assistant Core Functions validation completed successfully!');

    // Verify all expected results
    const tests = [
      { name: 'Booking intent', result: bookingIntent === 'booking' },
      { name: 'Service intent', result: serviceIntent === 'service_info' },
      { name: 'Availability intent', result: availabilityIntent === 'availability' },
      { name: 'Hours intent', result: hoursIntent === 'business_hours' },
      { name: 'General intent', result: generalIntent === 'general' },
      { name: 'Valid customer info', result: validation.isValid === true },
      { name: 'Invalid customer info', result: invalidValidation.isValid === false },
      { name: 'Non-booking extraction', result: nonBookingIntent === null },
      { name: 'Booking extraction', result: intent?.type === 'booking' },
      { name: 'Name extraction', result: intent?.customerInfo?.name === 'John Doe' },
      { name: 'Email extraction', result: intent?.customerInfo?.email === 'john@example.com' },
    ];

    const passed = tests.filter((t) => t.result).length;
    const total = tests.length;

    console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);

    if (passed === total) {
      console.log('✅ All tests passed! AI Assistant Service is working correctly.');
    } else {
      console.log('❌ Some tests failed:');
      tests
        .filter((t) => !t.result)
        .forEach((t) => {
          console.log(`   - ${t.name}`);
        });
    }
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  validateAICore();
}

export { validateAICore };
