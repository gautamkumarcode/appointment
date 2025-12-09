# Frontend Environment Variables Documentation

This document provides detailed information about all environment variables used in the AI Appointment Scheduler frontend (Next.js).

## Setup Instructions

1. Copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

2. Update the values in `.env.local` with your actual configuration.

3. **IMPORTANT**: Never commit `.env.local` files to version control.

## Next.js Environment Variable Rules

- Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- Variables without this prefix are only available server-side
- Changes require restarting the dev server

## Required Variables

### API Configuration

- **NEXT_PUBLIC_API_URL**: Backend API base URL
  - Development: `http://localhost:3000/api`
  - Production: `https://api.yourdomain.com/api`

- **NEXT_PUBLIC_WS_URL**: WebSocket URL for real-time features
  - Development: `ws://localhost:3000`
  - Production: `wss://api.yourdomain.com`

### Application Configuration

- **NEXT_PUBLIC_APP_URL**: Public URL of the frontend application
  - Development: `http://localhost:3001`
  - Production: `https://yourdomain.com`

- **NEXT_PUBLIC_APP_NAME**: Application name displayed in UI
  - Default: `AI Appointment Scheduler`

### Payment Gateway Public Keys

- **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**: Stripe publishable key
  - Safe to expose in frontend (starts with `pk_`)
  - Test: `pk_test_...`
  - Live: `pk_live_...`

- **NEXT_PUBLIC_RAZORPAY_KEY_ID**: Razorpay key ID
  - Safe to expose in frontend
  - Test and live keys available in Razorpay dashboard

## Feature Flags

- **NEXT_PUBLIC_CHAT_WIDGET_ENABLED**: Enable/disable AI chat widget
  - Values: `true` or `false`

- **NEXT_PUBLIC_CHAT_WIDGET_POSITION**: Chat widget position
  - Values: `bottom-right`, `bottom-left`

- **NEXT_PUBLIC_ENABLE_WHATSAPP**: Enable WhatsApp integration
  - Values: `true` or `false`

- **NEXT_PUBLIC_ENABLE_MESSENGER**: Enable Facebook Messenger integration
  - Values: `true` or `false`

- **NEXT_PUBLIC_ENABLE_INSTAGRAM**: Enable Instagram DM integration
  - Values: `true` or `false`

- **NEXT_PUBLIC_ENABLE_I18N**: Enable multi-language support
  - Values: `true` or `false`

## Optional Variables

### Analytics and Monitoring

- **NEXT_PUBLIC_GA_TRACKING_ID**: Google Analytics tracking ID
  - Format: `G-XXXXXXXXXX` or `UA-XXXXXXXXX-X`

- **NEXT_PUBLIC_HOTJAR_ID**: Hotjar site ID for user behavior analytics

- **NEXT_PUBLIC_SENTRY_DSN**: Sentry DSN for error tracking
  - Get from: https://sentry.io/

### Environment

- **NEXT_PUBLIC_ENV**: Current environment
  - Values: `development`, `staging`, `production`

### Timezone and Localization

- **NEXT_PUBLIC_DEFAULT_TIMEZONE**: Default timezone
  - Default: `UTC`
  - Examples: `America/New_York`, `Europe/London`, `Asia/Kolkata`

- **NEXT_PUBLIC_DEFAULT_LOCALE**: Default locale
  - Default: `en`
  - Examples: `en`, `es`, `fr`, `de`, `hi`

### Booking Configuration

- **NEXT_PUBLIC_MAX_BOOKING_DAYS**: Maximum days in advance for booking
  - Default: `90`
  - Customers can't book beyond this many days

- **NEXT_PUBLIC_MIN_BOOKING_HOURS**: Minimum hours in advance for booking
  - Default: `2`
  - Prevents last-minute bookings

### UI Configuration

- **NEXT_PUBLIC_DEFAULT_THEME**: Default theme
  - Values: `light`, `dark`, `system`

- **NEXT_PUBLIC_ENABLE_ANIMATIONS**: Enable UI animations
  - Values: `true` or `false`

## Environment-Specific Configuration

### Development

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=ws://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_ENV=development
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
```

### Production

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_...
```

## Security Considerations

1. **Only use NEXT*PUBLIC* for truly public data**
   - API keys that are safe to expose (Stripe publishable key)
   - Configuration that needs to be in the browser
   - Never expose secret keys or tokens

2. **Sensitive data should NOT have NEXT*PUBLIC* prefix**
   - These will only be available server-side
   - Examples: API secrets, database credentials

3. **Validate all public environment variables**
   - Check they exist at build time
   - Provide sensible defaults where appropriate

## Build-Time vs Runtime

- Next.js inlines `NEXT_PUBLIC_` variables at **build time**
- Changing these variables requires rebuilding the application
- For runtime configuration, use API endpoints instead

## Troubleshooting

### Variable Not Found

1. Ensure variable name starts with `NEXT_PUBLIC_`
2. Restart the development server
3. Check `.env.local` file exists and is in the root directory
4. Verify no typos in variable names

### Variable Shows as Undefined

1. Check if you're accessing it correctly: `process.env.NEXT_PUBLIC_API_URL`
2. Ensure the variable is set before starting the server
3. For production, verify the variable is set in your hosting platform

### CORS Issues

1. Verify `NEXT_PUBLIC_API_URL` matches your backend URL
2. Check backend CORS configuration allows your frontend URL
3. Ensure protocol matches (http vs https)

## Best Practices

1. **Use .env.local for local development**
   - Not committed to git
   - Overrides .env

2. **Use .env.production for production builds**
   - Can be committed (no secrets)
   - Used during production builds

3. **Document all variables**
   - Keep this file updated
   - Add comments in .env.example

4. **Validate required variables**
   - Check at application startup
   - Fail fast if missing

5. **Use TypeScript for type safety**
   ```typescript
   declare global {
     namespace NodeJS {
       interface ProcessEnv {
         NEXT_PUBLIC_API_URL: string;
         NEXT_PUBLIC_APP_URL: string;
         // ... other variables
       }
     }
   }
   ```

## Getting Help

- Next.js Environment Variables: https://nextjs.org/docs/basic-features/environment-variables
- Vercel Environment Variables: https://vercel.com/docs/concepts/projects/environment-variables
- Netlify Environment Variables: https://docs.netlify.com/configure-builds/environment-variables/
