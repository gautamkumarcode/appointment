import express from 'express';
import {
  createPaymentIntent,
  getPaymentStatus,
  handleRazorpayWebhook,
  handleStripeWebhook,
  refundPayment,
} from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenant';

const router = express.Router();

// Create payment intent (authenticated)
router.post('/create-intent', authenticate, resolveTenant, createPaymentIntent);

// Get payment status (authenticated)
router.get('/:id/status', authenticate, resolveTenant, getPaymentStatus);

// Refund payment (authenticated)
router.post('/:id/refund', authenticate, resolveTenant, refundPayment);

export default router;

// Separate router for webhooks (needs raw body)
export const webhookRouter = express.Router();

webhookRouter.post('/stripe', handleStripeWebhook);
webhookRouter.post('/razorpay', handleRazorpayWebhook);
