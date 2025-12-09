import { Request, Response } from 'express';
import { z } from 'zod';
import { paymentService } from '../services/paymentService';
import { logger } from '../utils/logger';

// Validation schemas
const createPaymentIntentSchema = z.object({
  appointmentId: z.string(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  provider: z.enum(['stripe', 'razorpay']),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Create payment intent
 */
export const createPaymentIntent = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validate request body
    const validationResult = createPaymentIntentSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
      return;
    }

    const { appointmentId, amount, currency, provider, metadata } = validationResult.data;

    let paymentIntent;

    if (provider === 'stripe') {
      paymentIntent = await paymentService.createStripePaymentIntent({
        tenantId,
        appointmentId,
        amount,
        currency,
        provider,
        metadata,
      });
    } else {
      paymentIntent = await paymentService.createRazorpayPaymentIntent({
        tenantId,
        appointmentId,
        amount,
        currency,
        provider,
        metadata,
      });
    }

    res.status(201).json(paymentIntent);
  } catch (error) {
    logger.error('Failed to create payment intent', { error });
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
};

/**
 * Handle Stripe webhook
 */
export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    // Process webhook with raw body
    await paymentService.processStripeWebhook(req.body, signature);

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook processing failed', { error });
    res.status(400).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Handle Razorpay webhook
 */
export const handleRazorpayWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;

    if (!signature) {
      res.status(400).json({ error: 'Missing x-razorpay-signature header' });
      return;
    }

    // Process webhook
    await paymentService.processRazorpayWebhook(req.body, signature);

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Razorpay webhook processing failed', { error });
    res.status(400).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Get payment status
 */
export const getPaymentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await paymentService.getPaymentStatus(id);

    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    res.json(payment);
  } catch (error) {
    logger.error('Failed to get payment status', { error });
    res.status(500).json({ error: 'Failed to get payment status' });
  }
};

/**
 * Refund payment
 */
export const refundPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { amount } = req.body;

    await paymentService.refundPayment(id, amount);

    res.json({ success: true, message: 'Payment refunded successfully' });
  } catch (error) {
    logger.error('Failed to refund payment', { error });
    res.status(500).json({ error: 'Failed to refund payment' });
  }
};
