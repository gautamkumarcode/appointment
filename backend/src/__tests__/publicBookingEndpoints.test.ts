import request from 'supertest';
import app from '../index';

describe('Public Booking API Endpoints', () => {
  describe('Route Registration', () => {
    it('should respond to GET /api/public/test-tenant/services', async () => {
      const response = await request(app).get('/api/public/test-tenant/services');

      // Should not be 404 (route exists), but may be 404 for tenant not found
      expect(response.status).not.toBe(404);
    });

    it('should respond to GET /api/public/test-tenant/availability', async () => {
      const response = await request(app).get('/api/public/test-tenant/availability');

      // Should not be 404 (route exists), but may be 400 for validation errors
      expect(response.status).not.toBe(404);
    });

    it('should respond to POST /api/public/test-tenant/book', async () => {
      const response = await request(app).post('/api/public/test-tenant/book').send({});

      // Should not be 404 (route exists), but may be 400 for validation errors
      expect(response.status).not.toBe(404);
    });

    it('should respond to GET /api/public/test-tenant/appointment/123', async () => {
      const response = await request(app).get('/api/public/test-tenant/appointment/123');

      // Should not be 404 (route exists), but may be 400 for missing token
      expect(response.status).not.toBe(404);
    });
  });

  describe('Tenant Resolution', () => {
    it('should return 404 for non-existent tenant', async () => {
      const response = await request(app).get('/api/public/non-existent-tenant-12345/services');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Tenant not found');
    });
  });

  describe('Validation', () => {
    it('should return validation error for missing parameters in availability endpoint', async () => {
      const response = await request(app).get('/api/public/test-tenant/availability').query({}); // No required parameters

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return validation error for invalid booking data', async () => {
      const response = await request(app).post('/api/public/test-tenant/book').send({}); // No required fields

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return error for missing token in appointment endpoint', async () => {
      const response = await request(app).get('/api/public/test-tenant/appointment/123').query({}); // No token

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Access token is required');
    });
  });
});
