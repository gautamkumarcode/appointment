# Embeddable AI Chat Widget System

## Overview

A complete embeddable widget system that allows business owners to integrate AI chat functionality into their existing websites through multiple methods:

1. **HTML Embed Code** - Simple script tag integration
2. **Direct Widget Links** - Standalone widget pages and iframes
3. **Widget Generator** - Visual configuration tool
4. **API Endpoints** - Programmatic widget generation

## 🚀 Quick Start for Business Owners

### Method 1: HTML Embed Code (Recommended)

```html
<!-- Add this code before closing </body> tag -->
<script>
	window.ChatWidgetConfig = {
		tenantId: "your-tenant-id-here",
		apiUrl: "https://your-domain.com/api",
		theme: {
			primaryColor: "#007bff",
			textColor: "#333333",
		},
		welcomeMessage: "Hi! How can I help you today?",
		position: "bottom-right",
		showBranding: true,
		bookingUrl: "https://your-booking-page.com",
	};
</script>
<script src="https://your-domain.com/chat-widget.js"></script>
```

### Method 2: Direct Link Integration

**As an iframe:**

```html
<iframe
	src="https://your-domain.com/widget?tenantId=YOUR_ID&primaryColor=%23007bff"
	width="100%"
	height="600"
	frameborder="0">
</iframe>
```

**As a popup link:**

```html
<a href="https://your-domain.com/widget?tenantId=YOUR_ID" target="_blank">
	Chat with us
</a>
```

## 🛠 Widget Generator Tool

Visit `/widget-generator` to use the visual configuration tool:

1. **Configure Settings**: Set colors, messages, position, etc.
2. **Preview Widget**: See how it looks in real-time
3. **Generate Code**: Get embed code or direct links
4. **Copy & Paste**: Integrate into your website

## 📋 Configuration Options

| Option               | Type    | Default                | Description                                                              |
| -------------------- | ------- | ---------------------- | ------------------------------------------------------------------------ |
| `tenantId`           | string  | **required**           | Your unique tenant identifier                                            |
| `apiUrl`             | string  | `/api`                 | API endpoint URL                                                         |
| `theme.primaryColor` | string  | `#007bff`              | Widget primary color                                                     |
| `theme.textColor`    | string  | `#333333`              | Text color                                                               |
| `welcomeMessage`     | string  | Default message        | First message shown to users                                             |
| `placeholder`        | string  | `Type your message...` | Input placeholder text                                                   |
| `position`           | string  | `bottom-right`         | Widget position (`bottom-right`, `bottom-left`, `top-right`, `top-left`) |
| `showBranding`       | boolean | `true`                 | Show "Powered by" footer                                                 |
| `bookingUrl`         | string  | `null`                 | Fallback booking link when AI is unavailable                             |

## 🎨 Customization Examples

### Custom Branding

```javascript
window.ChatWidgetConfig = {
	tenantId: "your-id",
	theme: {
		primaryColor: "#ff6b35", // Orange theme
		textColor: "#2c3e50",
	},
	welcomeMessage: "Welcome to Acme Corp! How can we help you today?",
	showBranding: false, // Remove "Powered by" footer
};
```

### Different Positions

```javascript
// Top left corner
window.ChatWidgetConfig = {
	tenantId: "your-id",
	position: "top-left",
};

// Bottom left corner
window.ChatWidgetConfig = {
	tenantId: "your-id",
	position: "bottom-left",
};
```

### With Booking Fallback

```javascript
window.ChatWidgetConfig = {
	tenantId: "your-id",
	bookingUrl: "https://calendly.com/your-calendar",
	welcomeMessage:
		"Hi! I'm here to help you book an appointment or answer questions.",
};
```

## 🔗 API Endpoints

### Get Widget Configuration

```
GET /api/widget/config/:tenantId
```

**Response:**

```json
{
	"success": true,
	"data": {
		"tenantId": "...",
		"businessName": "...",
		"theme": {
			"primaryColor": "#007bff",
			"textColor": "#333333"
		},
		"welcomeMessage": "...",
		"bookingUrl": "...",
		"showBranding": true
	}
}
```

### Generate Embed Code

```
GET /api/widget/embed/:tenantId?apiUrl=https://your-domain.com
```

**Response:**

```json
{
	"success": true,
	"data": {
		"embedCode": "<!-- HTML embed code -->",
		"directLink": "https://your-domain.com/widget?tenantId=..."
	}
}
```

## 🌐 Integration Examples

### WordPress

Add to your theme's `footer.php` before `</body>`:

```php
<script>
  window.ChatWidgetConfig = {
    tenantId: '<?php echo get_option('chat_widget_tenant_id'); ?>',
    apiUrl: 'https://your-domain.com/api',
    theme: {
      primaryColor: '<?php echo get_theme_mod('primary_color', '#007bff'); ?>'
    }
  };
</script>
<script src="https://your-domain.com/chat-widget.js"></script>
```

### Shopify

Add to `theme.liquid` before `</body>`:

```liquid
<script>
  window.ChatWidgetConfig = {
    tenantId: '{{ settings.chat_widget_tenant_id }}',
    apiUrl: 'https://your-domain.com/api',
    theme: {
      primaryColor: '{{ settings.colors_accent_1 }}'
    }
  };
</script>
<script src="https://your-domain.com/chat-widget.js"></script>
```

### React/Next.js

```jsx
import { useEffect } from "react";

export default function ChatWidget() {
	useEffect(() => {
		window.ChatWidgetConfig = {
			tenantId: process.env.NEXT_PUBLIC_TENANT_ID,
			apiUrl: process.env.NEXT_PUBLIC_API_URL,
			theme: {
				primaryColor: "#007bff",
			},
		};

		const script = document.createElement("script");
		script.src = `${process.env.NEXT_PUBLIC_API_URL.replace(
			"/api",
			""
		)}/chat-widget.js`;
		document.body.appendChild(script);

		return () => {
			document.body.removeChild(script);
		};
	}, []);

	return null;
}
```

## 📱 Mobile Responsiveness

The widget automatically adapts to mobile devices:

- Responsive sizing
- Touch-friendly controls
- Optimized for small screens
- Proper viewport handling

## 🔒 Security Features

- **CORS Protection**: Only allowed domains can embed
- **Rate Limiting**: Prevents abuse
- **Input Sanitization**: XSS protection
- **Tenant Isolation**: Each widget is scoped to its tenant

## 🚀 Advanced Features

### JavaScript API

Control the widget programmatically:

```javascript
// Open widget
window.ChatWidget.open();

// Close widget
window.ChatWidget.close();

// Minimize widget
window.ChatWidget.minimize();

// Send message programmatically
window.ChatWidget.sendMessage("Hello from my website!");
```

### Event Listeners

```javascript
// Listen for widget events
window.addEventListener("chatWidgetReady", function () {
	console.log("Chat widget is ready");
});

window.addEventListener("chatWidgetMessage", function (event) {
	console.log("New message:", event.detail);
});
```

## 🎯 Use Cases

1. **E-commerce Sites**: Product inquiries and support
2. **Service Businesses**: Appointment booking assistance
3. **SaaS Platforms**: Customer onboarding and support
4. **Healthcare**: Patient scheduling and information
5. **Real Estate**: Property inquiries and showings
6. **Restaurants**: Reservations and menu questions

## 📊 Analytics & Tracking

Track widget performance:

- Conversation starts
- Message volume
- User engagement
- Conversion rates
- Popular questions

## 🔧 Troubleshooting

### Widget Not Appearing

1. Check tenant ID is correct
2. Verify API URL is accessible
3. Check browser console for errors
4. Ensure script loads after DOM ready

### Styling Issues

1. Check CSS conflicts
2. Verify z-index settings
3. Test responsive breakpoints
4. Validate color values

### API Connection Problems

1. Verify CORS settings
2. Check network connectivity
3. Validate API endpoints
4. Review rate limiting

## 📞 Support

For technical support or custom integrations:

- Documentation: `/docs`
- API Reference: `/api-docs`
- Support Email: support@your-domain.com
- Live Chat: Use the widget on our site! 😉

---

**Ready to get started?** Visit `/widget-generator` to create your custom chat widget in minutes!
