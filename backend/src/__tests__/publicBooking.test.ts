import mongoose from 'mongoose';
import request from 'supertest';
import { connectDatabase } from '../config/database';
import app from '../index';
import { Appointment } from '../models/Appointment';
import { Customer } from '../models/Customer';
import { Service } from '../models/Service';
import { Staff } from '../models/Staff';
import { Tenant } from '../models/Tenant';

describe('Public Booking API Tests', () => {
  let tenantId: string;
  let tenantSlug: string;
  let serviceId: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectDatabase();
    }

    // Create test tenant
    const tenant = await Tenant.create({
      slug: 'test-clinic',
      businessName: 'Test Clinic',
      email: 'test@clinic.com',
      timezone: 'America/New_York',
      currency: 'USD',
      settings: {
        workingHours: {
          monday: [{ start: '09:00', end: '17:00' }],
          tuesday: [{ start: '09:00', end: '17:00' }],
          wednesday: [{ start: '09:00', end: '17:00' }],
          thursday: [{ start: '09:00', end: '17:00' }],
          friday: [{ start: '09:00', end: '17:00' }],
          saturday: [],
          sunday: [],
        },
      },
    });

    tenantId = tenant._id.toString();
    tenantSlug = tenant.slug;

    // Create test service
    const service = await Service.create({
      tenantId,
      name: 'Consultation',
      description: 'Medical consultation',
      durationMinutes: 30,
      price: 100,
      currency: 'USD',
      isActive: true,
    });

    serviceId = service._id.toString();

    // Create test staff (not used in current tests but may be needed for availability)
    await Staff.create({
      tenantId,
      name: 'Dr. Smith',
      email: 'dr.smith@clinic.com',
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
  }, 10000);

  afterEach(async () => {
    await Appointment.deleteMany({});
    await Customer.deleteMany({});
  });

  afterAll(async () => {
    await Appointment.deleteMany({});
    await Customer.deleteMany({});
    await Service.deleteMany({});
    await Staff.deleteMany({});
    await Tenant.deleteMany({});
  });

  describe('GET /api/public/:tenantSlug/services', () => {
    it('should return active services for a valid tenant', async () => {
      const response = await request(app).get(`/api/public/${tenantSlug}/services`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Consultation');
      expect(response.body.data[0].isActive).toBe(true);
    });

    it('should return 404 for invalid tenant slug', async () => {
      const response = await request(app).get('/api/public/invalid-tenant/services').expect(404);

      expect(response.body.error).toBe('Tenant not found');
    });
  });

  describe('GET /api/public/:tenantSlug/availability', () => {
    it('should return available slots for a service', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      const response = await request(app)
        .get(`/api/public/${tenantSlug}/availability`)
        .query({
          serviceId,
          startDate: tomorrow.toISOString(),
          endDate: dayAfter.toISOString(),
          timezone: 'America/New_York',
        })
        .expect(200);

      expect(response.body.slots).toBeDefined();
      expect(Array.isArray(response.body.slots)).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    it('should return 400 for missing required parameters', async () => {
      const response = await request(app)
        .get(`/api/public/${tenantSlug}/availability`)
        .query({
          // Missing serviceId and timezone
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/public/:tenantSlug/book', () => {
    it('should create a booking with valid data', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0); // 10:00 AM

      const endTime = new Date(tomorrow);
      endTime.setMinutes(endTime.getMinutes() + 30); // 30 minutes later

      const bookingData = {
        serviceId,
        startTime: tomorrow.toISOString(),
        endTime: endTime.toISOString(),
        customerTimezone: 'America/New_York',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        customerPhone: '+1234567890',
        paymentOption: 'pay_at_venue',
        notes: 'First visit',
      };

      const response = await request(app)
        .post(`/api/public/${tenantSlug}/book`)
        .send(bookingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.customerName).toBe('John Doe');
      expect(response.body.data.customerEmail).toBe('john@example.com');
    });

    it('should return 400 for invalid booking data', async () => {
      const bookingData = {
        // Missing required fields
        customerName: 'John Doe',
      };

      const response = await request(app)
        .post(`/api/public/${tenantSlug}/book`)
        .send(bookingData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/public/:tenantSlug/appointment/:id', () => {
    it('should return appointment with valid token', async () => {
      // First create an appointment
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0); // 2:00 PM

      const endTime = new Date(tomorrow);
      endTime.setMinutes(endTime.getMinutes() + 30);

      const bookingData = {
        serviceId,
        startTime: tomorrow.toISOString(),
        endTime: endTime.toISOString(),
        customerTimezone: 'America/New_York',
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        paymentOption: 'prepaid',
        amount: 100,
      };

      const bookingResponse = await request(app)
        .post(`/api/public/${tenantSlug}/book`)
        .send(bookingData)
        .expect(201);

      const appointmentId = bookingResponse.body.data._id;
      const rescheduleToken = bookingResponse.body.data.rescheduleToken;

      // Now try to get the appointment with token
      const response = await request(app)
        .get(`/api/public/${tenantSlug}/appointment/${appointmentId}`)
        .query({ token: rescheduleToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(appointmentId);
      expect(response.body.data.customerName).toBe('Jane Doe');
    });

    it('should return 400 for missing token', async () => {
      const response = await request(app)
        .get(`/api/public/${tenantSlug}/appointment/invalid-id`)
        .expect(400);

      expect(response.body.error).toBe('Access token is required');
    });

    it('should return 403 for invalid token', async () => {
      const response = await request(app)
        .get(`/api/public/${tenantSlug}/appointment/invalid-id`)
        .query({ token: 'invalid-token' })
        .expect(404);

      expect(response.body.error).toBe('Appointment not found');
    });
  });
});
