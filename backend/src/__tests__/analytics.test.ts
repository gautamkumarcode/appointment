import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Appointment } from '../models/Appointment';
import { Customer } from '../models/Customer';
import { Service } from '../models/Service';
import { Staff } from '../models/Staff';
import { Tenant } from '../models/Tenant';
import { analyticsService } from '../services/analyticsService';

describe('Analytics Service Tests', () => {
  let tenantId: string;
  let serviceId: string;
  let customerId1: string;
  let customerId2: string;

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
      slug: 'test-analytics-clinic',
      businessName: 'Test Analytics Clinic',
      email: 'analytics@test.com',
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
    await Staff.create({
      tenantId: tenant._id,
      name: 'Dr. Analytics',
      email: 'dr.analytics@test.com',
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

    // Create test customers
    const customer1 = await Customer.create({
      tenantId: tenant._id,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
    });
    customerId1 = customer1._id.toString();

    const customer2 = await Customer.create({
      tenantId: tenant._id,
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+1234567891',
    });
    customerId2 = customer2._id.toString();
  });

  afterEach(async () => {
    await Appointment.deleteMany({});
    await Customer.deleteMany({});
    await Service.deleteMany({});
    await Staff.deleteMany({});
    await Tenant.deleteMany({});
  });

  describe('getTotalBookings', () => {
    it('should calculate total bookings for time period', async () => {
      // Create appointments in different time periods
      await Appointment.create([
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId1),
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
          customerId: new mongoose.Types.ObjectId(customerId2),
          startTime: new Date('2024-12-11T14:00:00Z'),
          endTime: new Date('2024-12-11T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'completed',
          paymentOption: 'prepaid',
          paymentStatus: 'paid',
          amount: 100,
        },
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId1),
          startTime: new Date('2024-12-15T14:00:00Z'),
          endTime: new Date('2024-12-15T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'no-show',
          paymentOption: 'pay_at_venue',
          paymentStatus: 'unpaid',
        },
      ]);

      // Test without date filter - should return all appointments
      const totalBookings = await analyticsService.getTotalBookings(tenantId);
      expect(totalBookings).toBe(3);

      // Test with date range filter
      const filteredBookings = await analyticsService.getTotalBookings(tenantId, {
        startDate: new Date('2024-12-10T00:00:00Z'),
        endDate: new Date('2024-12-11T23:59:59Z'),
      });
      expect(filteredBookings).toBe(2);
    });

    it('should return 0 for tenant with no appointments', async () => {
      const totalBookings = await analyticsService.getTotalBookings(tenantId);
      expect(totalBookings).toBe(0);
    });
  });

  describe('getTotalRevenue', () => {
    it('should calculate total revenue from paid appointments only', async () => {
      await Appointment.create([
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId1),
          startTime: new Date('2024-12-10T14:00:00Z'),
          endTime: new Date('2024-12-10T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'completed',
          paymentOption: 'prepaid',
          paymentStatus: 'paid',
          amount: 100,
        },
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId2),
          startTime: new Date('2024-12-11T14:00:00Z'),
          endTime: new Date('2024-12-11T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'completed',
          paymentOption: 'prepaid',
          paymentStatus: 'paid',
          amount: 150,
        },
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId1),
          startTime: new Date('2024-12-12T14:00:00Z'),
          endTime: new Date('2024-12-12T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'confirmed',
          paymentOption: 'pay_at_venue',
          paymentStatus: 'unpaid', // This should not be included in revenue
          amount: 100,
        },
      ]);

      const totalRevenue = await analyticsService.getTotalRevenue(tenantId);
      expect(totalRevenue).toBe(250); // Only paid appointments: 100 + 150

      // Test with date range filter
      const filteredRevenue = await analyticsService.getTotalRevenue(tenantId, {
        startDate: new Date('2024-12-10T00:00:00Z'),
        endDate: new Date('2024-12-10T23:59:59Z'),
      });
      expect(filteredRevenue).toBe(100); // Only first appointment
    });

    it('should return 0 when no paid appointments exist', async () => {
      await Appointment.create({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        serviceId: new mongoose.Types.ObjectId(serviceId),
        customerId: new mongoose.Types.ObjectId(customerId1),
        startTime: new Date('2024-12-10T14:00:00Z'),
        endTime: new Date('2024-12-10T15:00:00Z'),
        customerTimezone: 'America/New_York',
        status: 'confirmed',
        paymentOption: 'pay_at_venue',
        paymentStatus: 'unpaid',
        amount: 100,
      });

      const totalRevenue = await analyticsService.getTotalRevenue(tenantId);
      expect(totalRevenue).toBe(0);
    });
  });

  describe('getNoShowCount', () => {
    it('should count no-show appointments correctly', async () => {
      await Appointment.create([
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId1),
          startTime: new Date('2024-12-10T14:00:00Z'),
          endTime: new Date('2024-12-10T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'no-show',
          paymentOption: 'pay_at_venue',
          paymentStatus: 'unpaid',
        },
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId2),
          startTime: new Date('2024-12-11T14:00:00Z'),
          endTime: new Date('2024-12-11T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'no-show',
          paymentOption: 'prepaid',
          paymentStatus: 'paid',
          amount: 100,
        },
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId1),
          startTime: new Date('2024-12-12T14:00:00Z'),
          endTime: new Date('2024-12-12T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'completed', // Not a no-show
          paymentOption: 'pay_at_venue',
          paymentStatus: 'unpaid',
        },
      ]);

      const noShowCount = await analyticsService.getNoShowCount(tenantId);
      expect(noShowCount).toBe(2);

      // Test with date range filter
      const filteredNoShows = await analyticsService.getNoShowCount(tenantId, {
        startDate: new Date('2024-12-10T00:00:00Z'),
        endDate: new Date('2024-12-10T23:59:59Z'),
      });
      expect(filteredNoShows).toBe(1);
    });

    it('should return 0 when no no-show appointments exist', async () => {
      await Appointment.create({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        serviceId: new mongoose.Types.ObjectId(serviceId),
        customerId: new mongoose.Types.ObjectId(customerId1),
        startTime: new Date('2024-12-10T14:00:00Z'),
        endTime: new Date('2024-12-10T15:00:00Z'),
        customerTimezone: 'America/New_York',
        status: 'completed',
        paymentOption: 'pay_at_venue',
        paymentStatus: 'unpaid',
      });

      const noShowCount = await analyticsService.getNoShowCount(tenantId);
      expect(noShowCount).toBe(0);
    });
  });

  describe('getRepeatCustomerCount', () => {
    it('should identify and count repeat customers correctly', async () => {
      // Customer 1 has 3 appointments (repeat customer)
      await Appointment.create([
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId1),
          startTime: new Date('2024-12-10T14:00:00Z'),
          endTime: new Date('2024-12-10T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'completed',
          paymentOption: 'pay_at_venue',
          paymentStatus: 'unpaid',
        },
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId1),
          startTime: new Date('2024-12-11T14:00:00Z'),
          endTime: new Date('2024-12-11T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'completed',
          paymentOption: 'prepaid',
          paymentStatus: 'paid',
          amount: 100,
        },
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId1),
          startTime: new Date('2024-12-12T14:00:00Z'),
          endTime: new Date('2024-12-12T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'no-show',
          paymentOption: 'pay_at_venue',
          paymentStatus: 'unpaid',
        },
        // Customer 2 has only 1 appointment (not a repeat customer)
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId2),
          startTime: new Date('2024-12-13T14:00:00Z'),
          endTime: new Date('2024-12-13T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'completed',
          paymentOption: 'pay_at_venue',
          paymentStatus: 'unpaid',
        },
      ]);

      const repeatCustomerCount = await analyticsService.getRepeatCustomerCount(tenantId);
      expect(repeatCustomerCount).toBe(1); // Only customer1 is a repeat customer

      // Test with date range filter that excludes some appointments
      const filteredRepeatCustomers = await analyticsService.getRepeatCustomerCount(tenantId, {
        startDate: new Date('2024-12-10T00:00:00Z'),
        endDate: new Date('2024-12-11T23:59:59Z'),
      });
      expect(filteredRepeatCustomers).toBe(1); // Customer1 still has 2 appointments in this range
    });

    it('should return 0 when no repeat customers exist', async () => {
      // Create single appointments for different customers
      await Appointment.create([
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId1),
          startTime: new Date('2024-12-10T14:00:00Z'),
          endTime: new Date('2024-12-10T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'completed',
          paymentOption: 'pay_at_venue',
          paymentStatus: 'unpaid',
        },
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId2),
          startTime: new Date('2024-12-11T14:00:00Z'),
          endTime: new Date('2024-12-11T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'completed',
          paymentOption: 'pay_at_venue',
          paymentStatus: 'unpaid',
        },
      ]);

      const repeatCustomerCount = await analyticsService.getRepeatCustomerCount(tenantId);
      expect(repeatCustomerCount).toBe(0);
    });
  });

  describe('getAnalytics', () => {
    it('should return comprehensive analytics for a time period', async () => {
      // Create a mix of appointments
      await Appointment.create([
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId1),
          startTime: new Date('2024-12-10T14:00:00Z'),
          endTime: new Date('2024-12-10T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'completed',
          paymentOption: 'prepaid',
          paymentStatus: 'paid',
          amount: 100,
        },
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId1),
          startTime: new Date('2024-12-11T14:00:00Z'),
          endTime: new Date('2024-12-11T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'no-show',
          paymentOption: 'pay_at_venue',
          paymentStatus: 'unpaid',
        },
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId2),
          startTime: new Date('2024-12-12T14:00:00Z'),
          endTime: new Date('2024-12-12T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'completed',
          paymentOption: 'prepaid',
          paymentStatus: 'paid',
          amount: 150,
        },
      ]);

      const analytics = await analyticsService.getAnalytics(tenantId);

      expect(analytics.totalBookings).toBe(3);
      expect(analytics.totalRevenue).toBe(250); // 100 + 150
      expect(analytics.noShowCount).toBe(1);
      expect(analytics.repeatCustomerCount).toBe(1); // customer1 has 2 appointments
    });

    it('should apply date range filtering correctly', async () => {
      await Appointment.create([
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId1),
          startTime: new Date('2024-12-10T14:00:00Z'),
          endTime: new Date('2024-12-10T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'completed',
          paymentOption: 'prepaid',
          paymentStatus: 'paid',
          amount: 100,
        },
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId2),
          startTime: new Date('2024-12-15T14:00:00Z'), // Outside filter range
          endTime: new Date('2024-12-15T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'no-show',
          paymentOption: 'pay_at_venue',
          paymentStatus: 'unpaid',
        },
      ]);

      const analytics = await analyticsService.getAnalytics(tenantId, {
        startDate: new Date('2024-12-10T00:00:00Z'),
        endDate: new Date('2024-12-12T23:59:59Z'),
      });

      expect(analytics.totalBookings).toBe(1); // Only first appointment
      expect(analytics.totalRevenue).toBe(100);
      expect(analytics.noShowCount).toBe(0); // No-show is outside date range
      expect(analytics.repeatCustomerCount).toBe(0); // Only one customer with one appointment in range
    });
  });

  describe('getDetailedAnalytics', () => {
    it('should return detailed analytics with breakdowns', async () => {
      await Appointment.create([
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId1),
          startTime: new Date('2024-12-10T14:00:00Z'),
          endTime: new Date('2024-12-10T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'completed',
          paymentOption: 'prepaid',
          paymentStatus: 'paid',
          amount: 100,
        },
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId2),
          startTime: new Date('2024-12-11T14:00:00Z'),
          endTime: new Date('2024-12-11T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'confirmed',
          paymentOption: 'pay_at_venue',
          paymentStatus: 'unpaid',
        },
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId1),
          startTime: new Date('2024-12-12T14:00:00Z'),
          endTime: new Date('2024-12-12T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'no-show',
          paymentOption: 'pay_at_venue',
          paymentStatus: 'unpaid',
        },
      ]);

      const detailedAnalytics = await analyticsService.getDetailedAnalytics(tenantId);

      // Basic analytics
      expect(detailedAnalytics.totalBookings).toBe(3);
      expect(detailedAnalytics.totalRevenue).toBe(100);
      expect(detailedAnalytics.noShowCount).toBe(1);
      expect(detailedAnalytics.repeatCustomerCount).toBe(1);

      // Status breakdown
      expect(detailedAnalytics.bookingsByStatus.completed).toBe(1);
      expect(detailedAnalytics.bookingsByStatus.confirmed).toBe(1);
      expect(detailedAnalytics.bookingsByStatus.noShow).toBe(1);
      expect(detailedAnalytics.bookingsByStatus.cancelled).toBe(0);

      // Payment breakdown
      expect(detailedAnalytics.paymentBreakdown.paid).toBe(1);
      expect(detailedAnalytics.paymentBreakdown.unpaid).toBe(2);
      expect(detailedAnalytics.paymentBreakdown.refunded).toBe(0);

      // Average booking value
      expect(detailedAnalytics.averageBookingValue).toBe(100); // 100 / 1 paid appointment
    });
  });

  describe('getMonthlyAnalytics', () => {
    it('should return monthly analytics for the year', async () => {
      await Appointment.create([
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId1),
          startTime: new Date('2024-01-15T14:00:00Z'),
          endTime: new Date('2024-01-15T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'completed',
          paymentOption: 'prepaid',
          paymentStatus: 'paid',
          amount: 100,
        },
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId2),
          startTime: new Date('2024-01-20T14:00:00Z'),
          endTime: new Date('2024-01-20T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'no-show',
          paymentOption: 'pay_at_venue',
          paymentStatus: 'unpaid',
        },
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId1),
          startTime: new Date('2024-03-15T14:00:00Z'),
          endTime: new Date('2024-03-15T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'completed',
          paymentOption: 'prepaid',
          paymentStatus: 'paid',
          amount: 150,
        },
      ]);

      const monthlyAnalytics = await analyticsService.getMonthlyAnalytics(tenantId, 2024);

      expect(monthlyAnalytics).toHaveLength(12); // All 12 months

      // January should have data
      const january = monthlyAnalytics.find((month) => month.month === 1);
      expect(january?.totalBookings).toBe(2);
      expect(january?.totalRevenue).toBe(100);
      expect(january?.noShowCount).toBe(1);

      // March should have data
      const march = monthlyAnalytics.find((month) => month.month === 3);
      expect(march?.totalBookings).toBe(1);
      expect(march?.totalRevenue).toBe(150);
      expect(march?.noShowCount).toBe(0);

      // February should be empty
      const february = monthlyAnalytics.find((month) => month.month === 2);
      expect(february?.totalBookings).toBe(0);
      expect(february?.totalRevenue).toBe(0);
      expect(february?.noShowCount).toBe(0);
    });
  });

  describe('tenant data isolation', () => {
    it('should only return analytics for the specified tenant', async () => {
      // Create another tenant
      const otherTenant = await Tenant.create({
        slug: 'other-clinic',
        businessName: 'Other Clinic',
        email: 'other@test.com',
        timezone: 'America/New_York',
        currency: 'USD',
      });

      // Create appointments for both tenants
      await Appointment.create([
        {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId1),
          startTime: new Date('2024-12-10T14:00:00Z'),
          endTime: new Date('2024-12-10T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'completed',
          paymentOption: 'prepaid',
          paymentStatus: 'paid',
          amount: 100,
        },
        {
          tenantId: otherTenant._id,
          serviceId: new mongoose.Types.ObjectId(serviceId),
          customerId: new mongoose.Types.ObjectId(customerId2),
          startTime: new Date('2024-12-10T14:00:00Z'),
          endTime: new Date('2024-12-10T15:00:00Z'),
          customerTimezone: 'America/New_York',
          status: 'completed',
          paymentOption: 'prepaid',
          paymentStatus: 'paid',
          amount: 200,
        },
      ]);

      const analytics = await analyticsService.getAnalytics(tenantId);

      // Should only include data for the specified tenant
      expect(analytics.totalBookings).toBe(1);
      expect(analytics.totalRevenue).toBe(100);
      expect(analytics.noShowCount).toBe(0);
      expect(analytics.repeatCustomerCount).toBe(0);
    });
  });
});
