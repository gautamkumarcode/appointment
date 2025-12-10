// Simple validation script for AI Assistant Service
import { aiAssistantService } from '../services/aiAssistantService';

async function validateAIService() {
  console.log('🤖 Validating AI Assistant Service...');

  try {
    // Test intent extraction
    const service = aiAssistantService as any;

    console.log('✅ Testing intent extraction...');
    const bookingIntent = service.extractIntent('I want to book an appointment');
    console.log(`   Booking intent: ${bookingIntent}`);

    const serviceIntent = service.extractIntent('What services do you offer?');
    console.log(`   Service intent: ${serviceIntent}`);

    const availabilityIntent = service.extractIntent('When are you available?');
    console.log(`   Availability intent: ${availabilityIntent}`);

    // Test customer info validation
    console.log('✅ Testing customer info validation...');
    const validInfo = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
    };

    const validation = service.validateCustomerInfo(validInfo);
    console.log(`   Valid info result: ${validation.isValid}`);

    const invalidInfo = {
      name: '',
      email: 'invalid-email',
    };

    const invalidValidation = service.validateCustomerInfo(invalidInfo);
    console.log(
      `   Invalid info result: ${invalidValidation.isValid}, missing: ${invalidValidation.missing.join(', ')}`
    );

    // Test booking intent extraction
    console.log('✅ Testing booking intent extraction...');
    const bookingMessage =
      'I want to book an appointment, my name is John Doe and my email is john@example.com';
    const intent = service.extractBookingIntent(bookingMessage);
    console.log(`   Extracted intent: ${intent?.type}`);
    console.log(`   Extracted name: ${intent?.customerInfo?.name}`);
    console.log(`   Extracted email: ${intent?.customerInfo?.email}`);

    // Test fallback message
    console.log('✅ Testing fallback message...');
    const fallback = service.handleUnclearIntent();
    console.log(`   Fallback message length: ${fallback.length} characters`);

    console.log('🎉 AI Assistant Service validation completed successfully!');
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  validateAIService();
}

export { validateAIService };
