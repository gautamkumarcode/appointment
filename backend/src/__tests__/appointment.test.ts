import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Appointment } from '../models/Appointment';
import { Customer } from '../models/Customer';
import { Service } from '../models/Service';
import { Staff } from '../models/Staff';
import { Tenant } from '../models/Tenant';
import { appointmentService } from '../services/appointmentService';

describe('Appointment Service Tests', () => {
  let tenantId: string;
  let serviceId: string;
  let staffId: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectDatabase();
    }
  }, 10000);

  afterAll(async () => {
    await Appointment.deleteMany({});
    await Customer.deleteMany({});
    await Service.deleteMany({});
    await Staff.deleteMany({});
    await Tenant.deleteMany({});
    await mongoose.connection.close();
  }, 10000);

  beforeEach(async () => {
    // Create test tenant
    const tenant = await Tenant.create({
      slug: 'test-appointment-clinic',
      businessName: 'Test Appointment Clinic',
      email: 'appointment@test.com',
      timezone: 'America/New_York',
      currency: 'USD',
    });
    tenantId = tenant._id.toString();

    // Create test service
    const service = await Service.create({
      tenantId: tenant._id,
      name: 'Consultation',
      durationMinutes: 60,
      price: 100,
      currency: 'USD',
      bufferMinutes: 15,
      isActive: true,
    });
    serviceId = service._id.toString();

    // Create test staff
    const staff = await Staff.create({
      tenantId: tenant._id,
      name: 'Dr. Smith',
      email: 'dr.smith@test.com',
      weeklySchedule: {
        monday: [{ start: '09:00', end: '17:00' }],
        tuesday: [{ start: '09:00', end: '17:00' }],
        wednesday: [{ start: '09:00', end: '17:00' }],
        thursday: [{ start: '09:00', end: '17:00' }],
        friday: [{ start: '09:00', end: '17:00' }],
        saturday: [],
        sunday: [],
      },
    });
    staffId = staff._id.toString();
  });

  afterEach(async () => {
    await Appointment.deleteMany({});
    await Customer.deleteMany({});
    await Service.deleteMany({});
    await Staff.deleteMany({});
    await Tenant.deleteMany({});
  });

  describe('createAppointment', () => {
    it('should create a new appointment with valid data', async () => {
      const startTime = new Date('2024-12-10T14:00:00Z');
      const endTime = new Date('2024-12-10T15:00:00Z');

      const appointmentData = {
        serviceId,
        startTime,
        endTime,
        customerTimezone: 'America/New_York',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        customerPhone: '+1234567890',
        staffId,
        notes: 'First appointment',
        paymentOption: 'pay_at_venue' as const,
      };

      const appointment = await appointmentService.createAppointment(tenantId, appointmentData);

      expect(appointment).toBeDefined();
      expect(appointment.status).toBe('confirmed');
      expect(appointment.startTime).toEqual(startTime);
      expect(appointment.endTime).toEqual(endTime);
      expect(appointment.rescheduleToken).toBeDefined();
      expect(appointment.paymentOption).toBe('pay_at_venue');
    });

    it('should automatically create a customer if they do not exist', async () => {
      const startTime = new Date('2024-12-10T14:00:00Z');
      const endTime = new Date('2024-12-10T15:00:00Z');

      const appointmentData = {
        serviceId,
        startTime,
        endTime,
        customerTimezone: 'America/New_York',
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        paymentOption: 'prepaid' as const,
      };

      const appointment = await appointmentService.createAppointment(tenantId, appointmentData);

      expect(appointment).toBeDefined();

      // Verify customer was created
      const customer = await Customer.findOne({ email: 'jane@example.com' });
      expect(customer).toBeDefined();
      expect(customer?.name).toBe('Jane Doe');
    });

    it('should reject booking for inactive service', async () => {
      // Deactivate the service
      await Service.findByIdAndUpdate(serviceId, { isActive: false });

      const startTime = new Date('2024-12-10T14:00:00Z');
      const endTime = new Date('2024-12-10T15:00:00Z');

      const appointmentData = {
        serviceId,
        startTime,
        endTime,
        customerTimezone: 'America/New_York',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        paymentOption: 'pay_at_venue' as const,
      };

      await expect(appointmentService.createAppointment(tenantId, appointmentData)).rejects.toThrow(
        'Service not found or inactive'
      );
    });

    it('should reject booking for unavailable time slot', async () => {
      const startTime = new Date('2024-12-10T14:00:00Z');
      const endTime = new Date('2024-12-10T15:00:00Z');

      // Create an existing appointment
      await Appointment.create({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        serviceId: new mongoose.Types.ObjectId(serviceId),
        customerId: new mongoose.Types.ObjectId(),
        staffId: new mongoose.Types.ObjectId(staffId),
        startTime,
        endTime,
        customerTimezone: 'America/New_York',
        status: 'confirmed',
        paymentOption: 'pay_at_venue',
        paymentStatus: 'unpaid',
      });

      // Try to book the same slot
      const appointmentData = {
        serviceId,
        startTime,
        endTime,
        customerTimezone: 'America/New_York',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        staffId,
        paymentOption: 'pay_at_venue' as const,
      };

      await expect(appointmentService.createAppointment(tenantId, appointmentData)).rejects.toThrow(
        'Selected time slot is no longer available'
      );
    });
  });

  describe('updateAppointmentStatus', () => {
    it('should update appointment status', async () => {
      // Create an appointment first
      const appointment = await Appointment.create({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        serviceId: new mongoose.Types.ObjectId(serviceId),
        customerId: new mongoose.Types.ObjectId(),
        startTime: new Date('2024-12-10T14:00:00Z'),
        endTime: new Date('2024-12-10T15:00:00Z'),
        customerTimezone: 'America/New_York',
        status: 'confirmed',
        paymentOption: 'pay_at_venue',
        paymentStatus: 'unpaid',
      });

      const updated = await appointmentService.updateAppointmentStatus(
        appointment._id.toString(),
        tenantId,
        'completed'
      );

      expect(updated).toBeDefined();
      expect(updated?.status).toBe('completed');
    });
  });

  describe('rescheduleAppointment', () => {
    it('should reschedule appointment to a new time slot', async () => {
      // Create an appointment
      const appointment = await Appointment.create({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        serviceId: new mongoose.Types.ObjectId(serviceId),
        customerId: new mongoose.Types.ObjectId(),
        staffId: new mongoose.Types.ObjectId(staffId),
        startTime: new Date('2024-12-10T14:00:00Z'),
        endTime: new Date('2024-12-10T15:00:00Z'),
        customerTimezone: 'America/New_York',
        status: 'confirmed',
        paymentOption: 'pay_at_venue',
        paymentStatus: 'unpaid',
      });

      const newStartTime = new Date('2024-12-10T16:00:00Z');
      const newEndTime = new Date('2024-12-10T17:00:00Z');

      const rescheduled = await appointmentService.rescheduleAppointment(
        appointment._id.toString(),
        tenantId,
        {
          newStartTime,
          newEndTime,
        }
      );

      expect(rescheduled).toBeDefined();
      expect(rescheduled?.startTime).toEqual(newStartTime);
      expect(rescheduled?.endTime).toEqual(newEndTime);
    });

    it('should not allow rescheduling cancelled appointments', async () => {
      // Create a cancelled appointment
      const appointment = await Appointment.create({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        serviceId: new mongoose.Types.ObjectId(serviceId),
        customerId: new mongoose.Types.ObjectId(),
        startTime: new Date('2024-12-10T14:00:00Z'),
        endTime: new Date('2024-12-10T15:00:00Z'),
        customerTimezone: 'America/New_York',
        status: 'cancelled',
        paymentOption: 'pay_at_venue',
        paymentStatus: 'unpaid',
      });

      const newStartTime = new Date('2024-12-10T16:00:00Z');
      const newEndTime = new Date('2024-12-10T17:00:00Z');

      await expect(
        appointmentService.rescheduleAppointment(appointment._id.toString(), tenantId, {
          newStartTime,
          newEndTime,
        })
      ).rejects.toThrow('Cannot reschedule cancelled appointment');
    });
  });

  describe('listAppointments', () => {
    it('should list appointments with filters', async () => {
      // Create multiple appointments
      const customer = await Customer.create({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        name: 'Test Customer',
        email: 'test@example.com',
      });

      await Appointment.create([
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: customer._id,
          startTime: new Date('2024-12-10T14:00:00Z'),
          endTime: new Date('2024-12-10T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'confirmed',
          paymentOption: 'pay_at_venue',
          paymentStatus: 'unpaid',
        },
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: customer._id,
          startTime: new Date('2024-12-11T14:00:00Z'),
          endTime: new Date('2024-12-11T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'completed',
          paymentOption: 'pay_at_venue',
          paymentStatus: 'unpaid',
        },
      ]);

      const result = await appointmentService.listAppointments(tenantId, {
        status: 'confirmed',
      });

      expect(result.appointments).toHaveLength(1);
      expect(result.appointments[0].status).toBe('confirmed');
      expect(result.total).toBe(1);
    });

    it('should sort appointments by date and time', async () => {
      const customer = await Customer.create({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        name: 'Test Customer',
        email: 'test@example.com',
      });

      await Appointment.create([
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: customer._id,
          startTime: new Date('2024-12-12T14:00:00Z'),
          endTime: new Date('2024-12-12T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'confirmed',
          paymentOption: 'pay_at_venue',
          paymentStatus: 'unpaid',
        },
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: customer._id,
          startTime: new Date('2024-12-10T14:00:00Z'),
          endTime: new Date('2024-12-10T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'confirmed',
          paymentOption: 'pay_at_venue',
          paymentStatus: 'unpaid',
        },
      ]);

      const result = await appointmentService.listAppointments(tenantId);

      expect(result.appointments).toHaveLength(2);
      // Should be sorted by startTime ascending
      expect(result.appointments[0].startTime.getTime()).toBeLessThan(
        result.appointments[1].startTime.getTime()
      );
    });
  });
});
