import { Payment } from '../../models/Payment';
import { PaymentService } from '../paymentService';

// Mock the models
jest.mock('../../models/Payment');
jest.mock('../../models/Appointment');

// Mock Stripe and Razorpay
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
        status: 'requires_payment_method',
        amount: 5000,
        currency: 'usd',
      }),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
    refunds: {
      create: jest.fn().mockResolvedValue({
        id: 're_test_123',
        status: 'succeeded',
      }),
    },
  }));
});

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn().mockResolvedValue({
        id: 'order_test_123',
        status: 'created',
        amount: 5000,
        currency: 'INR',
      }),
    },
  }));
});

describe('PaymentService', () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    paymentService = new PaymentService();
    jest.clearAllMocks();

    // Set up environment variables for tests
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.RAZORPAY_KEY_ID = 'rzp_test_123';
    process.env.RAZORPAY_KEY_SECRET = 'test_secret';
  });

  describe('createStripePaymentIntent', () => {
    it('should create a Stripe payment intent successfully', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        tenantId: 'tenant123',
        appointmentId: 'appt123',
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
        amount: 50,
        currency: 'USD',
        status: 'pending',
      });

      (Payment.create as jest.Mock) = mockCreate;

      const params = {
        tenantId: 'tenant123',
        appointmentId: 'appt123',
        amount: 50,
        currency: 'USD',
        provider: 'stripe' as const,
      };

      const result = await paymentService.createStripePaymentIntent(params);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('clientSecret');
      expect(result.amount).toBe(50);
      expect(result.currency).toBe('USD');
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should throw error when Stripe key is not configured', async () => {
      delete process.env.STRIPE_SECRET_KEY;

      const params = {
        tenantId: 'tenant123',
        appointmentId: 'appt123',
        amount: 50,
        currency: 'USD',
        provider: 'stripe' as const,
      };

      await expect(paymentService.createStripePaymentIntent(params)).rejects.toThrow();
    });
  });

  describe('createRazorpayPaymentIntent', () => {
    it('should create a Razorpay order successfully', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        tenantId: 'tenant123',
        appointmentId: 'appt123',
        provider: 'razorpay',
        providerPaymentId: 'order_test_123',
        amount: 500,
        currency: 'INR',
        status: 'pending',
      });

      (Payment.create as jest.Mock) = mockCreate;

      const params = {
        tenantId: 'tenant123',
        appointmentId: 'appt123',
        amount: 500,
        currency: 'INR',
        provider: 'razorpay' as const,
      };

      const result = await paymentService.createRazorpayPaymentIntent(params);

      expect(result).toHaveProperty('id');
      expect(result.amount).toBe(500);
      expect(result.currency).toBe('INR');
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should throw error when Razorpay credentials are not configured', async () => {
      delete process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_SECRET;

      const params = {
        tenantId: 'tenant123',
        appointmentId: 'appt123',
        amount: 500,
        currency: 'INR',
        provider: 'razorpay' as const,
      };

      await expect(paymentService.createRazorpayPaymentIntent(params)).rejects.toThrow();
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment status when payment exists', async () => {
      const mockPayment = {
        providerPaymentId: 'pi_test_123',
        status: 'completed',
        amount: 50,
        currency: 'USD',
        provider: 'stripe',
      };

      (Payment.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockPayment);

      const result = await paymentService.getPaymentStatus('pi_test_123');

      expect(result).toEqual({
        status: 'completed',
        amount: 50,
        currency: 'USD',
        provider: 'stripe',
      });
    });

    it('should return null when payment does not exist', async () => {
      (Payment.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);

      const result = await paymentService.getPaymentStatus('nonexistent');

      expect(result).toBeNull();
    });
  });
});
