import mongoose from 'mongoose';
import request from 'supertest';
import { connectDatabase } from '../config/database';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';

// Import app without starting the server
import app from '../index';

describe('Authentication and Tenant Integration Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await connectDatabase();
    }
  });

  afterAll(async () => {
    // Clean up and close connection
    await Tenant.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear collections before each test
    await Tenant.deleteMany({});
    await User.deleteMany({});
  });

  describe('POST /api/tenants/register', () => {
    it('should register a new tenant with owner account', async () => {
      const response = await request(app).post('/api/tenants/register').send({
        businessName: 'Test Clinic',
        email: 'owner@testclinic.com',
        phone: '+1234567890',
        timezone: 'America/New_York',
        currency: 'USD',
        ownerName: 'John Doe',
        ownerPassword: 'password123',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tenant).toBeDefined();
      expect(response.body.data.tenant.slug).toBe('test-clinic');
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeDefined();
    });
  });
});
