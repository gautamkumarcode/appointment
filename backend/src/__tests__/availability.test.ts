import { addDays, addHours, startOfDay } from 'date-fns';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Appointment } from '../models/Appointment';
import { Customer } from '../models/Customer';
import { Service } from '../models/Service';
import { Staff } from '../models/Staff';
import { Tenant } from '../models/Tenant';
import { checkSlotAvailability, generateTimeSlots } from '../services/availabilityService';

describe('Availability Service Tests', () => {
  let tenantId: string;
  let serviceId: string;
  let staffId: string;
  let customerId: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectDatabase();
    }
  });

  afterAll(async () => {
    await Tenant.deleteMany({});
    await Service.deleteMany({});
    await Staff.deleteMany({});
    await Appointment.deleteMany({});
    await Customer.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear collections
    await Tenant.deleteMany({});
    await Service.deleteMany({});
    await Staff.deleteMany({});
    await Appointment.deleteMany({});
    await Customer.deleteMany({});

    // Create test tenant
    const tenant = await Tenant.create({
      slug: 'test-clinic',
      businessName: 'Test Clinic',
      email: 'test@clinic.com',
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
      email: 'dr.smith@clinic.com',
      weeklySchedule: {
        monday: [{ start: '09:00', end: '17:00' }],
        tuesday: [{ start: '09:00', end: '17:00' }],
        wednesday: [{ start: '09:00', end: '17:00' }],
        thursday: [{ start: '09:00', end: '17:00' }],
        friday: [{ start: '09:00', end: '17:00' }],
      },
    });
    staffId = staff._id.toString();

    // Create test customer
    const customer = await Customer.create({
      tenantId: tenant._id,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
    });
    customerId = customer._id.toString();
  });

  describe('generateTimeSlots', () => {
    it('should generate available time slots for a service', async () => {
      const tomorrow = addDays(new Date(), 1);
      const slots = await generateTimeSlots({
        tenantId,
        serviceId,
        staffId,
        startDate: tomorrow,
        endDate: tomorrow,
        timezone: 'America/New_York',
      });

      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0]).toHaveProperty('startTime');
      expect(slots[0]).toHaveProperty('endTime');
      expect(slots[0]).toHaveProperty('startTimeLocal');
      expect(slots[0]).toHaveProperty('endTimeLocal');
    });

    it('should exclude already booked time slots', async () => {
      const tomorrow = addDays(new Date(), 1);
      const tomorrowStart = startOfDay(tomorrow);
      const appointmentStart = addHours(tomorrowStart, 10); // 10 AM
      const appointmentEnd = addHours(tomorrowStart, 11); // 11 AM

      // Create an existing appointment
      await Appointment.create({
        tenantId,
        serviceId,
        customerId,
        staffId,
        startTime: appointmentStart,
        endTime: appointmentEnd,
        customerTimezone: 'America/New_York',
        status: 'confirmed',
        paymentOption: 'pay_at_venue',
        paymentStatus: 'unpaid',
      });

      const slots = await generateTimeSlots({
        tenantId,
        serviceId,
        staffId,
        startDate: tomorrow,
        endDate: tomorrow,
        timezone: 'America/New_York',
      });

      // Check that no slot overlaps with the booked appointment
      const overlappingSlot = slots.find((slot) => {
        return (
          (slot.startTime >= appointmentStart && slot.startTime < appointmentEnd) ||
          (slot.endTime > appointmentStart && slot.endTime <= appointmentEnd)
        );
      });

      expect(overlappingSlot).toBeUndefined();
    });
  });

  describe('checkSlotAvailability', () => {
    it('should return true for an available slot', async () => {
      const tomorrow = addDays(new Date(), 1);
      const tomorrowStart = startOfDay(tomorrow);
      const slotStart = addHours(tomorrowStart, 10);
      const slotEnd = addHours(tomorrowStart, 11);

      const isAvailable = await checkSlotAvailability(
        tenantId,
        serviceId,
        slotStart,
        slotEnd,
        staffId
      );

      expect(isAvailable).toBe(true);
    });

    it('should return false for a slot that conflicts with existing appointment', async () => {
      const tomorrow = addDays(new Date(), 1);
      const tomorrowStart = startOfDay(tomorrow);
      const appointmentStart = addHours(tomorrowStart, 10);
      const appointmentEnd = addHours(tomorrowStart, 11);

      // Create an existing appointment
      await Appointment.create({
        tenantId,
        serviceId,
        customerId,
        staffId,
        startTime: appointmentStart,
        endTime: appointmentEnd,
        customerTimezone: 'America/New_York',
        status: 'confirmed',
        paymentOption: 'pay_at_venue',
        paymentStatus: 'unpaid',
      });

      const isAvailable = await checkSlotAvailability(
        tenantId,
        serviceId,
        appointmentStart,
        appointmentEnd,
        staffId
      );

      expect(isAvailable).toBe(false);
    });
  });
});
