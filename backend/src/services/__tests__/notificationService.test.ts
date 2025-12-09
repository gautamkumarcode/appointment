import { IAppointment } from '../../models/Appointment';
import { ICustomer } from '../../models/Customer';
import { IService } from '../../models/Service';
import { IStaff } from '../../models/Staff';
import { ITenant } from '../../models/Tenant';
import calendarService from '../calendarService';
import emailService from '../emailService';
import notificationService from '../notificationService';
import smsService from '../smsService';

// Mock the services
jest.mock('../emailService');
jest.mock('../smsService');
jest.mock('../calendarService');

describe('NotificationService', () => {
  const mockTenant: Partial<ITenant> = {
    _id: 'tenant123' as any,
    slug: 'test-business',
    businessName: 'Test Business',
    email: 'business@test.com',
    phone: '+1234567890',
    primaryColor: '#4F46E5',
  };

  const mockCustomer: Partial<ICustomer> = {
    _id: 'customer123' as any,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
  };

  const mockService: Partial<IService> = {
    _id: 'service123' as any,
    name: 'Haircut',
    durationMinutes: 30,
    price: 50,
    currency: 'USD',
  };

  const mockStaff: Partial<IStaff> = {
    _id: 'staff123' as any,
    name: 'Jane Smith',
    email: 'jane@test.com',
  };

  const mockAppointment: Partial<IAppointment> = {
    _id: 'appt123' as any,
    startTime: new Date('2024-01-15T10:00:00Z'),
    endTime: new Date('2024-01-15T10:30:00Z'),
    customerTimezone: 'America/New_York',
    status: 'confirmed',
    rescheduleToken: 'token123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FRONTEND_URL = 'http://localhost:3001';
  });

  describe('sendAppointmentConfirmation', () => {
    it('should send email and SMS confirmation with calendar invite', async () => {
      const mockCalendarBuffer = Buffer.from('calendar data');
      (calendarService.generateCalendarInvite as jest.Mock).mockReturnValue(mockCalendarBuffer);

      await notificationService.sendAppointmentConfirmation({
        appointment: mockAppointment as IAppointment,
        customer: mockCustomer as ICustomer,
        service: mockService as IService,
        staff: mockStaff as IStaff,
        tenant: mockTenant as ITenant,
      });

      expect(calendarService.generateCalendarInvite).toHaveBeenCalledWith({
        appointment: mockAppointment,
        customer: mockCustomer,
        service: mockService,
        staff: mockStaff,
        tenant: mockTenant,
      });

      expect(emailService.sendConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          appointment: mockAppointment,
          customer: mockCustomer,
          service: mockService,
          staff: mockStaff,
          tenant: mockTenant,
          rescheduleLink: expect.stringContaining('reschedule'),
        }),
        mockCalendarBuffer
      );

      expect(smsService.sendConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          appointment: mockAppointment,
          customer: mockCustomer,
          service: mockService,
        })
      );
    });

    it('should not send SMS if customer has no phone number', async () => {
      const customerWithoutPhone = { ...mockCustomer, phone: undefined };

      await notificationService.sendAppointmentConfirmation({
        appointment: mockAppointment as IAppointment,
        customer: customerWithoutPhone as ICustomer,
        service: mockService as IService,
        tenant: mockTenant as ITenant,
      });

      expect(emailService.sendConfirmation).toHaveBeenCalled();
      expect(smsService.sendConfirmation).not.toHaveBeenCalled();
    });
  });

  describe('sendAppointmentReminder', () => {
    it('should send email and SMS reminder', async () => {
      await notificationService.sendAppointmentReminder({
        appointment: mockAppointment as IAppointment,
        customer: mockCustomer as ICustomer,
        service: mockService as IService,
        staff: mockStaff as IStaff,
        tenant: mockTenant as ITenant,
      });

      expect(emailService.sendReminder).toHaveBeenCalled();
      expect(smsService.sendReminder).toHaveBeenCalled();
    });
  });

  describe('sendRescheduleNotification', () => {
    it('should send reschedule notification with updated calendar invite', async () => {
      const mockCalendarBuffer = Buffer.from('calendar data');
      (calendarService.generateCalendarInvite as jest.Mock).mockReturnValue(mockCalendarBuffer);

      await notificationService.sendRescheduleNotification({
        appointment: mockAppointment as IAppointment,
        customer: mockCustomer as ICustomer,
        service: mockService as IService,
        tenant: mockTenant as ITenant,
      });

      expect(calendarService.generateCalendarInvite).toHaveBeenCalled();
      expect(emailService.sendRescheduleNotification).toHaveBeenCalled();
      expect(smsService.sendRescheduleNotification).toHaveBeenCalled();
    });
  });

  describe('sendCancellationNotification', () => {
    it('should send cancellation notification', async () => {
      await notificationService.sendCancellationNotification({
        appointment: mockAppointment as IAppointment,
        customer: mockCustomer as ICustomer,
        service: mockService as IService,
        tenant: mockTenant as ITenant,
      });

      expect(emailService.sendCancellation).toHaveBeenCalled();
      expect(smsService.sendCancellation).toHaveBeenCalled();
    });
  });

  describe('sendFollowUpMessage', () => {
    it('should send follow-up message', async () => {
      await notificationService.sendFollowUpMessage({
        appointment: mockAppointment as IAppointment,
        customer: mockCustomer as ICustomer,
        service: mockService as IService,
        tenant: mockTenant as ITenant,
      });

      expect(emailService.sendFollowUp).toHaveBeenCalled();
      expect(smsService.sendFollowUp).toHaveBeenCalled();
    });
  });

  describe('sendNoShowReminder', () => {
    it('should send no-show rebooking reminder', async () => {
      await notificationService.sendNoShowReminder({
        appointment: mockAppointment as IAppointment,
        customer: mockCustomer as ICustomer,
        service: mockService as IService,
        tenant: mockTenant as ITenant,
      });

      expect(emailService.sendNoShowReminder).toHaveBeenCalled();
      expect(smsService.sendNoShowReminder).toHaveBeenCalled();
    });
  });
});
