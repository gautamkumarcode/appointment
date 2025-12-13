# Widget Components Fix

## Issues Identified

### 1. ChatWidget Component Issues

- **Wrong API endpoint**: Using `/api/ai/chat` (authenticated) instead of `/api/ai/public/chat`
- **Missing tenant ID header**: Not sending `X-Tenant-ID` header
- **Missing session ID**: Not sending `externalId` for conversation tracking

### 2. Widget Showcase Issues

- **Fake tenant IDs**: Using demo tenant IDs that don't exist in database
- **Non-functional demos**: Live demo links don't work without real tenant data
- **No real data testing**: No way to test with actual tenant configuration

### 3. External Widget Script Issues

- **Complex initialization**: Overly complex tenant config fetching
- **Missing session tracking**: Not generating unique session IDs
- **Inconsistent tenant ID usage**: Using config.tenantId instead of fetched tenant data

## Fixes Applied

### 1. Fixed ChatWidget Component

```typescript
// Changed from:
const response = await fetch(`${apiUrl}/ai/chat`, {
	method: "POST",
	headers: {
		"Content-Type": "application/json",
	},
	body: JSON.stringify({
		message: userMessage.content,
		conversationId,
		channel: "web",
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
	}),
});

// To:
const response = await fetch(`${apiUrl}/ai/public/chat`, {
	method: "POST",
	headers: {
		"Content-Type": "application/json",
		"X-Tenant-ID": tenantId,
	},
	body: JSON.stringify({
		message: userMessage.content,
		conversationId,
		channel: "web",
		externalId: sessionId,
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
	}),
});
```

### 2. Enhanced Widget Showcase

```typescript
// Added tenant ID input for testing
const [realTenantId, setRealTenantId] = useState<string>('');

// Updated demo configs to use real tenant ID when provided
tenantId: realTenantId || 'demo-healthcare',

// Fixed live demo links
href={realTenantId
  ? `/widget?websiteUrl=https://demo.example.com&tenantId=${currentDemo.tenantId}&...`
  : '#'
}

// Added validation for demo functionality
onClick={!realTenantId ? (e) => {
  e.preventDefault();
  alert('Please enter your tenant ID above to test with real data...');
} : undefined}
```

### 3. External Widget Script Improvements

```javascript
// Added session ID generation
let sessionId = `web-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Fixed tenant ID usage
'X-Tenant-ID': tenantConfig?.tenantId || config.tenantId,

// Added session tracking
body: JSON.stringify({
  message,
  conversationId,
  channel: 'web',
  externalId: sessionId,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
}),
```

## How to Test the Fixes

### 1. Test ChatWidget Component

1. Go to any page that uses the ChatWidget component
2. Open browser dev tools and check network requests
3. Verify requests go to `/api/ai/public/chat` with `X-Tenant-ID` header

### 2. Test Widget Showcase

1. Go to `/widget-showcase`
2. Enter your real tenant ID in the input field
3. Select a demo configuration
4. Click "Live Demo" - should open working widget
5. Test the chat functionality

### 3. Test External Widget Script

1. Create an HTML file with the widget embed code
2. Set `websiteUrl` to a registered domain
3. Load the page and test the widget
4. Check that chat requests include proper headers and session ID

## Key Improvements

### 1. Consistent API Usage

- All widget components now use `/api/ai/public/chat`
- All requests include proper `X-Tenant-ID` header
- All requests include `externalId` for session tracking

### 2. Better Error Handling

- Clear error messages when tenant ID is missing
- Fallback behavior when domain lookup fails
- User-friendly validation messages

### 3. Real Data Testing

- Widget showcase can use real tenant data
- Clear instructions for testing with actual configuration
- Proper validation of required parameters

### 4. Session Management

- Unique session IDs for each widget instance
- Proper conversation tracking across messages
- Consistent session handling across all components

## Next Steps

1. **Test all widget components** with real tenant data
2. **Verify chat functionality** works end-to-end
3. **Check conversation persistence** across multiple messages
4. **Validate booking flow** works properly in widgets
5. **Test embed code generation** produces working widgets

The widget system should now be fully functional with proper API integration, session management, and real data support.
