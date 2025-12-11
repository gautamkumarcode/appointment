# Widget Testing Guide

## Testing the Widget Preview Functionality

### Prerequisites

1. Backend server running on port 4500
2. Frontend server running on port 3000
3. MongoDB connected and running
4. At least one tenant account created

### Step-by-Step Testing

#### 1. Test Widget Generator

1. Navigate to `/dashboard/widget-generator`
2. Enter a website URL (e.g., `https://example.com`)
3. Configure widget settings (colors, welcome message)
4. Click "Preview" button
5. Should open widget in new tab

#### 2. Test Widget Preview

1. Widget page should load at `/widget?websiteUrl=...`
2. Should show loading state initially
3. Should either:
   - Load successfully with tenant configuration
   - Show error if domain not registered
   - Fall back to tenant ID if available

#### 3. Test AI Chat Functionality

1. In the widget preview, type a message
2. Should send request to `/api/ai/public/chat`
3. Should receive AI response
4. Should maintain conversation history

### API Endpoints Created

#### Frontend API Routes (Proxy to Backend)

- `POST /api/widget/config-by-domain` - Get tenant config by domain
- `POST /api/ai/public/chat` - Send chat messages
- `GET /api/ai/public/widget/config` - Get widget configuration

#### Backend API Routes

- `POST /api/widget/config-by-domain` - Domain-based tenant lookup
- `POST /api/ai/public/chat` - Handle public chat messages
- `GET /api/ai/public/widget/config` - Get widget config
- `POST /api/tenants/register-domain` - Register domain for tenant

### Common Issues and Solutions

#### 1. 404 Error on Preview

- **Cause**: Domain not registered or not found
- **Solution**: Check if domain was registered in `tenant.allowedDomains`

#### 2. 500 Error on Chat

- **Cause**: Missing tenant ID or AI service issues
- **Solution**: Check X-Tenant-ID header and AI service configuration

#### 3. CORS Issues

- **Cause**: Frontend/backend URL mismatch
- **Solution**: Check environment variables in `.env.local`

### Environment Variables to Check

#### Frontend (.env.local)

```
NEXT_PUBLIC_API_URL=http://192.168.1.13:4500/api
NEXT_PUBLIC_FRONTEND_URL=http://192.168.1.13:3000
```

#### Backend (.env)

```
PORT=4500
MONGODB_URI=mongodb://localhost:27017/ai-scheduler
```

### Testing Checklist

- [ ] Widget generator loads without errors
- [ ] Domain registration works when entering URL
- [ ] Preview button opens widget in new tab
- [ ] Widget page loads with correct configuration
- [ ] Chat functionality works (send/receive messages)
- [ ] Error handling works for invalid domains
- [ ] Fallback to tenant ID works when domain lookup fails

### Debug Information

#### Check Browser Console

- Look for network errors (404, 500)
- Check API request/response data
- Verify tenant ID is being passed correctly

#### Check Backend Logs

- Domain registration events
- Widget configuration requests
- AI chat message processing

#### Check Database

- Verify tenant has `allowedDomains` array populated
- Check conversation and message records are created

### Success Criteria

The widget preview functionality is working correctly when:

1. User can enter website URL and see preview immediately
2. Widget loads with correct branding and configuration
3. AI chat responds to user messages
4. Error states are handled gracefully
5. Domain registration happens automatically

### Recent Fixes Applied

#### Duplicate Key Error Fix

- **Issue**: MongoDB E11000 duplicate key error on `channel_1_externalId_1` index
- **Cause**: Multiple web conversations created with `externalId: null`
- **Solution**:
  - Frontend generates unique session ID for each widget instance
  - Session ID sent as `externalId` in chat requests
  - Backend uses provided `externalId` or generates unique fallback
- **Result**: Each widget session has unique conversation, preventing duplicates

#### Conversation Management

- Each widget instance gets unique session ID: `web-session-{timestamp}-{random}`
- Session ID maintains conversation continuity within same browser session
- Multiple browser tabs/windows get separate conversations
- Conversations properly linked to tenant and session
