import { aiAssistantService } from '../aiAssistantService';

// Mock dependencies
jest.mock('../serviceService');
jest.mock('../appointmentService');
jest.mock('../availabilityService');
jest.mock('../../models/AIConversation');
jest.mock('../../models/AIMessage');
jest.mock('../../models/Tenant');

describe('AIAssistantService', () => {
  describe('extractIntent', () => {
    it('should extract booking intent from message', () => {
      const service = aiAssistantService as any;

      expect(service.extractIntent('I want to book an appointment')).toBe('booking');
      expect(service.extractIntent('Can I schedule something?')).toBe('booking');
      expect(service.extractIntent('What services do you offer?')).toBe('service_info');
      expect(service.extractIntent('What are your hours?')).toBe('business_hours');
      expect(service.extractIntent('When are you available?')).toBe('availability');
      expect(service.extractIntent('Hello there')).toBe('general');
    });
  });

  describe('validateCustomerInfo', () => {
    it('should validate customer information correctly', () => {
      const service = aiAssistantService as any;

      // Valid info
      const validInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
      };

      const validResult = service.validateCustomerInfo(validInfo);
      expect(validResult.isValid).toBe(true);
      expect(validResult.missing).toHaveLength(0);

      // Missing name
      const missingName = {
        email: 'john@example.com',
        phone: '123-456-7890',
      };

      const missingNameResult = service.validateCustomerInfo(missingName);
      expect(missingNameResult.isValid).toBe(false);
      expect(missingNameResult.missing).toContain('name');

      // Invalid email
      const invalidEmail = {
        name: 'John Doe',
        email: 'invalid-email',
        phone: '123-456-7890',
      };

      const invalidEmailResult = service.validateCustomerInfo(invalidEmail);
      expect(invalidEmailResult.isValid).toBe(false);
      expect(invalidEmailResult.missing).toContain('email');
    });
  });

  describe('handleUnclearIntent', () => {
    it('should return a helpful fallback message', () => {
      const service = aiAssistantService as any;
      const response = service.handleUnclearIntent();

      expect(response).toContain('help');
      expect(response).toContain('services');
      expect(response).toContain('appointment');
    });
  });

  describe('extractBookingIntent', () => {
    it('should extract booking intent from messages', () => {
      const service = aiAssistantService as any;

      // Should return null for non-booking messages
      expect(service.extractBookingIntent('What are your hours?')).toBeNull();

      // Should extract booking intent
      const bookingMessage = 'I want to book an appointment';
      const intent = service.extractBookingIntent(bookingMessage);
      expect(intent).not.toBeNull();
      expect(intent?.type).toBe('booking');

      // Should extract customer info from message
      const messageWithInfo =
        'I want to book an appointment, my name is John Doe and my email is john@example.com';
      const intentWithInfo = service.extractBookingIntent(messageWithInfo);
      expect(intentWithInfo?.customerInfo?.name).toBe('John Doe');
      expect(intentWithInfo?.customerInfo?.email).toBe('john@example.com');
    });
  });

  describe('extractDateFromMessage', () => {
    it('should extract dates from natural language', () => {
      const service = aiAssistantService as any;

      expect(service.extractDateFromMessage('I want to book for today')).toBe('today');
      expect(service.extractDateFromMessage('How about tomorrow?')).toBeDefined();
      expect(service.extractDateFromMessage('Next Monday would work')).toBeDefined();
    });
  });

  describe('extractTimeFromMessage', () => {
    it('should extract times from various formats', () => {
      const service = aiAssistantService as any;

      expect(service.extractTimeFromMessage('at 2:30 PM')).toBe('14:30');
      expect(service.extractTimeFromMessage('around 9 AM')).toBe('09:00');
      expect(service.extractTimeFromMessage('at 14:00')).toBe('14:00');
      expect(service.extractTimeFromMessage('no time mentioned')).toBeUndefined();
    });
  });

  describe('parseDateTime', () => {
    it('should parse date and time combinations', () => {
      const service = aiAssistantService as any;

      const result = service.parseDateTime('2024-12-15', '14:30');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getHours()).toBe(14);
      expect(result?.getMinutes()).toBe(30);

      const todayResult = service.parseDateTime('today', '09:00');
      expect(todayResult).toBeInstanceOf(Date);
      expect(todayResult?.getHours()).toBe(9);

      const invalidResult = service.parseDateTime('invalid-date', '25:00');
      expect(invalidResult).toBeNull();
    });
  });

  describe('generateBookingConfirmation', () => {
    it('should generate proper confirmation messages', () => {
      const service = aiAssistantService as any;

      const mockAppointment = {
        startTime: new Date('2024-12-15T14:30:00Z'),
        service: { name: 'Haircut' },
        staff: { name: 'John Smith' },
        paymentOption: 'pay_at_venue',
      };

      const confirmation = service.generateBookingConfirmation(mockAppointment, 'pay_at_venue');

      expect(confirmation).toContain('confirmed');
      expect(confirmation).toContain('Haircut');
      expect(confirmation).toContain('John Smith');
      expect(confirmation).toContain('pay when you arrive');
    });

    it('should handle prepaid payment option', () => {
      const service = aiAssistantService as any;

      const mockAppointment = {
        startTime: new Date('2024-12-15T14:30:00Z'),
        service: { name: 'Consultation' },
        paymentOption: 'prepaid',
      };

      const confirmation = service.generateBookingConfirmation(mockAppointment, 'prepaid');

      expect(confirmation).toContain('Payment Link');
      expect(confirmation).toContain('complete payment');
    });
  });
});
