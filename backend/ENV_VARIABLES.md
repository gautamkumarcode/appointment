# Environment Variables Documentation

This document provides detailed information about all environment variables used in the AI Appointment Scheduler backend.

## Setup Instructions

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Update the values in `.env` with your actual credentials and configuration.

3. **IMPORTANT**: Never commit `.env` files to version control. The `.gitignore` file should already exclude them.

## Required Variables

These variables MUST be set for the application to function:

### Server Configuration

- **NODE_ENV**: Application environment (`development`, `staging`, `production`)
- **PORT**: Port number for the Express server (default: 3000)
- **LOG_LEVEL**: Logging verbosity (`error`, `warn`, `info`, `debug`)

### Database

- **DATABASE_URL**: PostgreSQL connection string
  - Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA`
  - Example: `postgresql://postgres:password@localhost:5432/appointment_scheduler?schema=public`

### Redis

- **REDIS_HOST**: Redis server hostname (default: localhost)
- **REDIS_PORT**: Redis server port (default: 6379)
- **REDIS_PASSWORD**: Redis password (leave empty if no password)
- **REDIS_DB**: Redis database index (0-15, default: 0)

### JWT Authentication

- **JWT_SECRET**: Secret key for signing JWT tokens
  - **CRITICAL**: Use a strong, random string in production
  - Generate with: `openssl rand -base64 32`
- **JWT_EXPIRES_IN**: Access token expiration (e.g., `7d`, `24h`, `30m`)
- **JWT_REFRESH_EXPIRES_IN**: Refresh token expiration (e.g., `30d`)

### Frontend URL

- **FRONTEND_URL**: URL of the frontend application for CORS and redirects
- **ALLOWED_ORIGINS**: Comma-separated list of allowed CORS origins

## Payment Gateways

### Stripe (Global Payments)

- **STRIPE_SECRET_KEY**: Stripe secret API key (starts with `sk_`)
- **STRIPE_PUBLISHABLE_KEY**: Stripe publishable key (starts with `pk_`)
- **STRIPE_WEBHOOK_SECRET**: Webhook signing secret (starts with `whsec_`)

Get credentials from: https://dashboard.stripe.com/apikeys

### Razorpay (India-based Payments)

- **RAZORPAY_KEY_ID**: Razorpay key ID
- **RAZORPAY_KEY_SECRET**: Razorpay key secret
- **RAZORPAY_WEBHOOK_SECRET**: Webhook signing secret

Get credentials from: https://dashboard.razorpay.com/app/keys

## Communication Services

### Email (SendGrid)

- **SENDGRID_API_KEY**: SendGrid API key for sending emails
- **FROM_EMAIL**: Sender email address (must be verified in SendGrid)
- **FROM_NAME**: Sender name displayed in emails

Get API key from: https://app.sendgrid.com/settings/api_keys

### SMS/WhatsApp (Twilio)

- **TWILIO_ACCOUNT_SID**: Twilio account SID
- **TWILIO_AUTH_TOKEN**: Twilio authentication token
- **TWILIO_PHONE_NUMBER**: Twilio phone number for SMS (format: +1234567890)
- **TWILIO_WHATSAPP_NUMBER**: Twilio WhatsApp number (format: whatsapp:+1234567890)

Get credentials from: https://console.twilio.com/

### WhatsApp Cloud API

- **WHATSAPP_PHONE_NUMBER_ID**: WhatsApp Business phone number ID
- **WHATSAPP_ACCESS_TOKEN**: WhatsApp Business API access token
- **WHATSAPP_VERIFY_TOKEN**: Webhook verification token (you create this)

Setup guide: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started

### Facebook Messenger

- **FACEBOOK_PAGE_ACCESS_TOKEN**: Facebook Page access token
- **FACEBOOK_VERIFY_TOKEN**: Webhook verification token (you create this)
- **FACEBOOK_APP_SECRET**: Facebook App secret for signature verification

Setup guide: https://developers.facebook.com/docs/messenger-platform/getting-started

### Instagram Direct Messages

- **INSTAGRAM_ACCESS_TOKEN**: Instagram access token
- **INSTAGRAM_VERIFY_TOKEN**: Webhook verification token (you create this)

Setup guide: https://developers.facebook.com/docs/instagram-api/guides/messaging

## AI/LLM Configuration

Choose ONE of the following providers:

### OpenAI

- **OPENAI_API_KEY**: OpenAI API key
- **OPENAI_MODEL**: Model to use (e.g., `gpt-4`, `gpt-3.5-turbo`)

Get API key from: https://platform.openai.com/api-keys

### Anthropic Claude

- **ANTHROPIC_API_KEY**: Anthropic API key
- **ANTHROPIC_MODEL**: Model to use (e.g., `claude-3-opus-20240229`, `claude-3-sonnet-20240229`)

Get API key from: https://console.anthropic.com/settings/keys

### AI Settings

- **AI_RESPONSE_TIMEOUT**: Maximum time to wait for AI response in milliseconds (default: 5000)
- **AI_MAX_TOKENS**: Maximum tokens in AI response (default: 1000)

## Optional Variables

### Rate Limiting

- **RATE_LIMIT_WINDOW_MS**: Rate limit window in milliseconds (default: 900000 = 15 minutes)
- **RATE_LIMIT_MAX_REQUESTS**: Maximum requests per window (default: 100)

### Background Jobs

- **QUEUE_CONCURRENCY**: Number of concurrent job workers (default: 5)
- **REMINDER_CHECK_INTERVAL**: Interval to check for reminders in milliseconds (default: 3600000 = 1 hour)

### Timezone

- **DEFAULT_TIMEZONE**: Default system timezone (default: UTC)

### Security

- **CORS_ENABLED**: Enable CORS (default: true)
- **COOKIE_SECURE**: Use secure cookies (set to true in production)
- **COOKIE_SAME_SITE**: Cookie SameSite policy (`strict`, `lax`, `none`)

### File Storage (AWS S3)

Optional - for storing uploaded files like business logos:

- **AWS_ACCESS_KEY_ID**: AWS access key ID
- **AWS_SECRET_ACCESS_KEY**: AWS secret access key
- **AWS_REGION**: AWS region (e.g., `us-east-1`)
- **AWS_S3_BUCKET**: S3 bucket name

### Monitoring

- **SENTRY_DSN**: Sentry DSN for error tracking
- **APP_INSIGHTS_KEY**: Application Insights instrumentation key

## Environment-Specific Recommendations

### Development

- Use test/sandbox credentials for all payment gateways
- Set `NODE_ENV=development`
- Use `LOG_LEVEL=debug` for verbose logging
- `COOKIE_SECURE=false` is acceptable

### Production

- Use production credentials for all services
- Set `NODE_ENV=production`
- Use `LOG_LEVEL=info` or `warn`
- **MUST** set `COOKIE_SECURE=true`
- **MUST** use strong `JWT_SECRET` (generate with `openssl rand -base64 32`)
- Enable rate limiting with appropriate values
- Configure monitoring tools (Sentry, etc.)
- Use environment variable management service (AWS Secrets Manager, HashiCorp Vault, etc.)

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Rotate secrets regularly**, especially JWT_SECRET and API keys
3. **Use different credentials** for development, staging, and production
4. **Restrict API key permissions** to only what's needed
5. **Enable webhook signature verification** for all payment and messaging webhooks
6. **Use environment variable management** services in production
7. **Audit access** to production environment variables regularly

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running: `pg_isready`
- Check connection string format
- Ensure database exists: `psql -l`
- Verify user permissions

### Redis Connection Issues

- Verify Redis is running: `redis-cli ping`
- Check host and port configuration
- Test connection: `redis-cli -h HOST -p PORT`

### Payment Webhook Issues

- Verify webhook URLs are publicly accessible
- Check webhook signature verification
- Review webhook logs in payment gateway dashboard
- Ensure webhook secrets match

### AI/LLM Issues

- Verify API key is valid
- Check API quota/limits
- Review model name spelling
- Monitor response timeout settings

## Getting Help

For issues with specific services:

- **Stripe**: https://support.stripe.com/
- **Razorpay**: https://razorpay.com/support/
- **SendGrid**: https://support.sendgrid.com/
- **Twilio**: https://support.twilio.com/
- **OpenAI**: https://help.openai.com/
- **Anthropic**: https://support.anthropic.com/
