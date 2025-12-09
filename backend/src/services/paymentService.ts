import crypto from 'crypto';
import Razorpay from 'razorpay';
import Stripe from 'stripe';
import { Appointment } from '../models/Appointment';
import { Payment } from '../models/Payment';
import { logger } from '../utils/logger';

// Initialize Stripe
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe secret key not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
};

// Initialize Razorpay
const getRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials not configured');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

export interface CreatePaymentIntentParams {
  tenantId: string;
  appointmentId: string;
  amount: number;
  currency: string;
  provider: 'stripe' | 'razorpay';
  metadata?: Record<string, unknown>;
}

export interface PaymentIntent {
  id: string;
  clientSecret?: string;
  amount: number;
  currency: string;
  status: string;
}

export class PaymentService {
  /**
   * Create a payment intent with Stripe
   */
  async createStripePaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent> {
    try {
      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(params.amount * 100), // Convert to cents
        currency: params.currency.toLowerCase(),
        metadata: {
          tenantId: params.tenantId,
          appointmentId: params.appointmentId,
          ...params.metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Create payment record
      await Payment.create({
        tenantId: params.tenantId,
        appointmentId: params.appointmentId,
        provider: 'stripe',
        providerPaymentId: paymentIntent.id,
        amount: params.amount,
        currency: params.currency,
        status: 'pending',
        metadata: params.metadata,
      });

      logger.info('Stripe payment intent created', {
        paymentIntentId: paymentIntent.id,
        appointmentId: params.appointmentId,
      });

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || undefined,
        amount: params.amount,
        currency: params.currency,
        status: paymentIntent.status,
      };
    } catch (error) {
      logger.error('Failed to create Stripe payment intent', { error, params });
      throw new Error('Failed to create payment intent');
    }
  }

  /**
   * Create a payment order with Razorpay
   */
  async createRazorpayPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent> {
    try {
      const razorpay = getRazorpay();
      const order = await razorpay.orders.create({
        amount: Math.round(params.amount * 100), // Convert to paise
        currency: params.currency.toUpperCase(),
        notes: {
          tenantId: params.tenantId,
          appointmentId: params.appointmentId,
          ...params.metadata,
        },
      });

      // Create payment record
      await Payment.create({
        tenantId: params.tenantId,
        appointmentId: params.appointmentId,
        provider: 'razorpay',
        providerPaymentId: order.id,
        amount: params.amount,
        currency: params.currency,
        status: 'pending',
        metadata: params.metadata,
      });

      logger.info('Razorpay order created', {
        orderId: order.id,
        appointmentId: params.appointmentId,
      });

      return {
        id: order.id,
        amount: params.amount,
        currency: params.currency,
        status: order.status,
      };
    } catch (error) {
      logger.error('Failed to create Razorpay order', { error, params });
      throw new Error('Failed to create payment order');
    }
  }

  /**
   * Process Stripe webhook
   */
  async processStripeWebhook(payload: string | Buffer, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    try {
      const stripe = getStripe();
      // Verify webhook signature
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

      logger.info('Stripe webhook received', { type: event.type });

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handleStripePaymentSuccess(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handleStripePaymentFailure(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.canceled':
          await this.handleStripePaymentCanceled(event.data.object as Stripe.PaymentIntent);
          break;

        default:
          logger.info('Unhandled Stripe webhook event type', { type: event.type });
      }
    } catch (error) {
      logger.error('Stripe webhook processing failed', { error });
      throw error;
    }
  }

  /**
   * Process Razorpay webhook
   */
  async processRazorpayWebhook(payload: Record<string, unknown>, signature: string): Promise<void> {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('Razorpay webhook secret not configured');
    }

    try {
      // Verify webhook signature
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (signature !== expectedSignature) {
        throw new Error('Invalid Razorpay webhook signature');
      }

      const event = payload.event as string;
      logger.info('Razorpay webhook received', { event });

      // Handle different event types
      switch (event) {
        case 'payment.captured':
          await this.handleRazorpayPaymentSuccess(payload.payload as Record<string, unknown>);
          break;

        case 'payment.failed':
          await this.handleRazorpayPaymentFailure(payload.payload as Record<string, unknown>);
          break;

        default:
          logger.info('Unhandled Razorpay webhook event type', { event });
      }
    } catch (error) {
      logger.error('Razorpay webhook processing failed', { error });
      throw error;
    }
  }

  /**
   * Handle successful Stripe payment
   */
  private async handleStripePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      // Update payment record
      const payment = await Payment.findOneAndUpdate(
        { providerPaymentId: paymentIntent.id },
        { status: 'completed' },
        { new: true }
      );

      if (!payment) {
        logger.error('Payment record not found', { paymentIntentId: paymentIntent.id });
        return;
      }

      // Update appointment
      if (payment.appointmentId) {
        await Appointment.findByIdAndUpdate(payment.appointmentId, {
          paymentStatus: 'paid',
          paymentId: payment.providerPaymentId,
        });

        logger.info('Appointment payment status updated', {
          appointmentId: payment.appointmentId,
          paymentId: payment.providerPaymentId,
        });
      }
    } catch (error) {
      logger.error('Failed to handle Stripe payment success', { error, paymentIntent });
      throw error;
    }
  }

  /**
   * Handle failed Stripe payment
   */
  private async handleStripePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      // Update payment record
      const payment = await Payment.findOneAndUpdate(
        { providerPaymentId: paymentIntent.id },
        { status: 'failed' },
        { new: true }
      );

      if (!payment) {
        logger.error('Payment record not found', { paymentIntentId: paymentIntent.id });
        return;
      }

      logger.info('Payment marked as failed', {
        paymentId: payment.providerPaymentId,
        appointmentId: payment.appointmentId,
      });
    } catch (error) {
      logger.error('Failed to handle Stripe payment failure', { error, paymentIntent });
      throw error;
    }
  }

  /**
   * Handle canceled Stripe payment
   */
  private async handleStripePaymentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      // Update payment record
      await Payment.findOneAndUpdate({ providerPaymentId: paymentIntent.id }, { status: 'failed' });

      logger.info('Payment marked as canceled', { paymentIntentId: paymentIntent.id });
    } catch (error) {
      logger.error('Failed to handle Stripe payment cancellation', { error, paymentIntent });
      throw error;
    }
  }

  /**
   * Handle successful Razorpay payment
   */
  private async handleRazorpayPaymentSuccess(payload: Record<string, unknown>): Promise<void> {
    try {
      const paymentEntity = payload.payment as Record<string, unknown>;
      const orderId = paymentEntity.order_id as string;

      // Update payment record
      const payment = await Payment.findOneAndUpdate(
        { providerPaymentId: orderId },
        { status: 'completed' },
        { new: true }
      );

      if (!payment) {
        logger.error('Payment record not found', { orderId });
        return;
      }

      // Update appointment
      if (payment.appointmentId) {
        await Appointment.findByIdAndUpdate(payment.appointmentId, {
          paymentStatus: 'paid',
          paymentId: payment.providerPaymentId,
        });

        logger.info('Appointment payment status updated', {
          appointmentId: payment.appointmentId,
          paymentId: payment.providerPaymentId,
        });
      }
    } catch (error) {
      logger.error('Failed to handle Razorpay payment success', { error, payload });
      throw error;
    }
  }

  /**
   * Handle failed Razorpay payment
   */
  private async handleRazorpayPaymentFailure(payload: Record<string, unknown>): Promise<void> {
    try {
      const paymentEntity = payload.payment as Record<string, unknown>;
      const orderId = paymentEntity.order_id as string;

      // Update payment record
      await Payment.findOneAndUpdate({ providerPaymentId: orderId }, { status: 'failed' });

      logger.info('Payment marked as failed', { orderId });
    } catch (error) {
      logger.error('Failed to handle Razorpay payment failure', { error, payload });
      throw error;
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<{
    status: string;
    amount: number;
    currency: string;
    provider: string;
  } | null> {
    try {
      const payment = await Payment.findOne({ providerPaymentId: paymentId });

      if (!payment) {
        return null;
      }

      return {
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        provider: payment.provider,
      };
    } catch (error) {
      logger.error('Failed to get payment status', { error, paymentId });
      throw error;
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string, amount?: number): Promise<void> {
    try {
      const payment = await Payment.findOne({ providerPaymentId: paymentId });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'completed') {
        throw new Error('Can only refund completed payments');
      }

      const refundAmount = amount || payment.amount;

      if (payment.provider === 'stripe') {
        const stripe = getStripe();
        await stripe.refunds.create({
          payment_intent: payment.providerPaymentId,
          amount: Math.round(refundAmount * 100),
        });
      } else if (payment.provider === 'razorpay') {
        // For Razorpay, we need the payment ID, not order ID
        // This would need to be stored separately or retrieved
        throw new Error('Razorpay refund not fully implemented');
      }

      // Update payment status
      await Payment.findByIdAndUpdate(payment._id, {
        status: 'refunded',
      });

      // Update appointment
      if (payment.appointmentId) {
        await Appointment.findByIdAndUpdate(payment.appointmentId, {
          paymentStatus: 'refunded',
        });
      }

      logger.info('Payment refunded', { paymentId, refundAmount });
    } catch (error) {
      logger.error('Failed to refund payment', { error, paymentId });
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
