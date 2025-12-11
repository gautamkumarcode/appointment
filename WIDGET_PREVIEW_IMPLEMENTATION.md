# Widget Preview Implementation

## Overview
The widget preview functionality allows users to test their AI chat widget before embedding it on their website. This document explains how the preview system works.

## How It Works

### 1. Widget Generator Page
- User enters their website URL in the widget generator
- System automatically registers the domain with the tenant account
- Preview button generates a direct link to the widget page

### 2. Domain Registration
- When user enters a website URL, it's automatically registered via `/api/tenants/register-domain`
- Domain is cleaned (removes protocol, trailing slash) and stored in `tenant.allowedDomains` array
- Uses `$addToSet` to prevent duplicates

### 3. Preview Link Generation
- Creates URL with `websiteUrl` parameter: `/widget?websiteUrl=https://example.com&...`
- Includes tenant ID as fallback parameter
- Includes all widget configuration (colors, messages, etc.)

### 4. Widget Page Loading Process
1. **Primary Method**: Try to load config by website URL
   - Calls `/api/widget/config-by-domain` 
   - Backend looks up tenant by `allowedDomains` field
   - Returns full tenant configuration

2. **Fallback Method**: If domain lookup fails, use tenant ID directly
   - Uses URL parameters for configuration
   - Maintains backward compatibility

### 5. Backend Domain Lookup
- Route: `POST /api/widget/config-by-domain`
- Searches for tenant with matching domain in `allowedDomains` array
- Supports multiple domain formats (with/without protocol)
- Returns tenant configuration for widget

## API Endpoints

### Frontend API Route
- `POST /app/api/widget/config-by-domain/route.ts`
- Proxies requests to backend API
- Handles CORS and authentication

### Backend API Routes
- `POST /api/widget/config-by-domain` - Get config by domain
- `POST /api/tenants/register-domain` - Register domain for tenant

## Error Handling

### Domain Not Found
- Shows clear error message with domain name
- Suggests checking domain registration
- Provides fallback to tenant ID if available

### Missing Website URL
- Preview button is disabled until URL is entered
- Shows alert if user tries to preview without URL

### API Errors
- Graceful fallback to tenant ID method
- Clear error messages for debugging
- Retry functionality

## Testing the Preview

1. Go to Widget Generator page
2. Enter a website URL (e.g., `https://example.com`)
3. Configure widget settings (colors, messages)
4. Click "Preview" button
5. Widget opens in new tab with full-screen chat interface

## Files Modified

### Frontend
- `frontend/app/dashboard/widget-generator/page.tsx` - Main generator page
- `frontend/app/widget/page.tsx` - Widget preview page
- `frontend/app/api/widget/config-by-domain/route.ts` - API proxy

### Backend
- `backend/src/routes/widgetRoutes.ts` - Widget API routes
- `backend/src/controllers/tenantController.ts` - Domain registration
- `backend/src/services/tenantService.ts` - Domain management
- `backend/src/models/Tenant.ts` - Added allowedDomains field

## Key Features

1. **Automatic Domain Registration**: No manual setup required
2. **Fallback Support**: Works even if domain lookup fails
3. **Real-time Preview**: See exactly how widget will look
4. **Error Recovery**: Graceful handling of various failure scenarios
5. **Security**: Domain validation prevents unauthorized usage

## Next Steps

The widget preview functionality is now complete and ready for testing. Users can:
- Enter their website URL
- Preview the widget immediately
- Copy embed code for their website
- Test all widget configurations in real-time