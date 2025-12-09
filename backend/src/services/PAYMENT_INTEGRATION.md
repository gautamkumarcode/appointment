# Payment Integration Guide

This document describes the payment integration implementation for both Stripe and Razorpay payment gateways.

## Overview

The payment integration supports:

- **Stripe**: Global payment processing
- **Razorpay**: India-based payment processing

## Architecture

### Components

1. **PaymentService** (`src/services/paymentService.ts`)
   - Core business logic for payment processing
   - Handles payment intent creation
   - Processes webhooks from payment providers
   - Updates payment and appointment status

2. **PaymentController** (`src/controllers/paymentController.ts`)
   - HTTP request handlers
   - Input validation using Zod
   - Error handling and response formatting

3. **Payment Routes** (`src/routes/paymentRoutes.ts`)
   - API endpoint definitions
   - Authentication middleware integration
   - Separate webhook router for raw body handling

## API Endpoints

### Authenticated Endpoints

#### Create Payment Intent

```
POST /api/payments/create-intent
Authorization: Bearer <jwt_token>

Request Body:
{
  "appointmentId": "string",
  "amount": number,
  "currency": "string", // 3-letter currency code
  "provider": "stripe" | "razorpay",
  "metadata": {} // optional
}

Response:
{
  "id": "string", // Payment intent/order ID
  "clientSecret": "string", // For Stripe only
  "amount": number,
  "currency": "string",
  "status": "string"
}
```

#### Get Payment Status

```
GET /api/payments/:id/status
Authorization: Bearer <jwt_token>

Response:
{
  "status": "pending" | "completed" | "failed" | "refunded",
  "amount": number,
  "currency": "string",
  "provider": "stripe" | "razorpay"
}
```

#### Refund Payment

```
POST /api/payments/:id/refund
Authorization: Bearer <jwt_token>

Request Body:
{
  "amount": number // optional, defaults to full refund
}

Response:
{
  "success": true,
  "message": "Payment refunded successfully"
}
```

### Webhook Endpoints (No Authentication)

#### Stripe Webhook

```
POST /api/payments/webhook/stripe
Headers:
  stripe-signature: <signature>

Body: Raw JSON from Stripe
```

#### Razorpay Webhook

```
POST /api/payments/webhook/razorpay
Headers:
  x-razorpay-signature: <signature>

Body: JSON from Razorpay
```

## Environment Variables

Required environment variables in `.env`:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Razorpay
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

## Webhook Configuration

### Stripe Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/payments/webhook/stripe`
3. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### Razorpay Webhook Setup

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/payments/webhook/razorpay`
3. Select events:
   - `payment.captured`
   - `payment.failed`
4. Copy the webhook secret to `RAZORPAY_WEBHOOK_SECRET`

## Payment Flow

### Prepaid Booking Flow

1. Customer selects service and time slot
2. Customer chooses "prepaid" payment option
3. Frontend calls `POST /api/payments/create-intent`
4. Backend creates payment intent/order
5. Frontend redirects to payment gateway with client secret/order ID
6. Customer completes payment
7. Payment gateway sends webhook to backend
8. Backend verifies webhook signature
9. Backend updates payment status to "completed"
10. Backend updates appointment payment status to "paid"
11. Customer receives confirmation

### Pay at Venue Flow

1. Customer selects service and time slot
2. Customer chooses "pay at venue" option
3. Appointment is created with `paymentStatus: "unpaid"`
4. No payment processing required
5. Business owner marks as paid after in-person payment

## Security Features

### Webhook Signature Verification

**Stripe:**

- Uses `stripe.webhooks.constructEvent()` to verify signatures
- Prevents replay attacks and unauthorized webhooks

**Razorpay:**

- Uses HMAC SHA256 signature verification
- Compares computed signature with provided signature

### Authentication

- All non-webhook endpoints require JWT authentication
- Tenant isolation enforced via middleware
- Payment records are scoped to tenant

## Error Handling

### Payment Creation Errors

- Invalid credentials → 500 error with generic message
- Invalid input → 400 error with validation details
- Missing authentication → 401 error

### Webhook Processing Errors

- Invalid signature → 400 error, webhook rejected
- Missing webhook secret → 500 error
- Payment record not found → Logged, webhook acknowledged

## Testing

### Unit Tests

Run payment service tests:

```bash
npm test -- --testPathPattern=paymentService
```

### Manual Testing with Test Mode

**Stripe Test Cards:**

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires authentication: `4000 0025 0000 3155`

**Razorpay Test Mode:**

- Use test API keys (starting with `rzp_test_`)
- All test payments succeed automatically

### Webhook Testing

Use webhook testing tools:

- Stripe CLI: `stripe listen --forward-to localhost:3000/api/payments/webhook/stripe`
- Razorpay: Use webhook testing in dashboard

## Database Schema

### Payment Model

```typescript
{
  tenantId: ObjectId,
  appointmentId: ObjectId,
  provider: 'stripe' | 'razorpay',
  providerPaymentId: string, // Unique payment ID from provider
  amount: number,
  currency: string,
  status: 'pending' | 'completed' | 'failed' | 'refunded',
  metadata: object,
  createdAt: Date,
  updatedAt: Date
}
```

### Appointment Payment Fields

```typescript
{
  paymentOption: 'prepaid' | 'pay_at_venue',
  paymentStatus: 'unpaid' | 'paid' | 'refunded',
  paymentId: string, // Reference to Payment.providerPaymentId
  amount: number
}
```

## Troubleshooting

### Common Issues

1. **"Stripe secret key not configured"**
   - Ensure `STRIPE_SECRET_KEY` is set in `.env`
   - Check that `.env` file is loaded

2. **"Razorpay credentials not configured"**
   - Ensure both `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set
   - Verify credentials are valid

3. **Webhook signature verification fails**
   - Check webhook secret is correct
   - Ensure raw body is passed to webhook handler
   - Verify webhook endpoint is registered before `express.json()` middleware

4. **Payment status not updating**
   - Check webhook is configured correctly
   - Verify webhook secret matches
   - Check logs for webhook processing errors

## Future Enhancements

- [ ] Support for partial refunds
- [ ] Payment retry logic for failed payments
- [ ] Payment analytics and reporting
- [ ] Support for additional payment providers
- [ ] Subscription/recurring payment support
- [ ] Payment dispute handling
