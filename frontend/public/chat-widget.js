/**
 * Embeddable Chat Widget Script
 *
 * Usage:
 * <script>
 *   window.ChatWidgetConfig = {
 *     tenantId: 'your-tenant-id',
 *     apiUrl: 'https://your-domain.com/api',
 *     theme: {
 *       primaryColor: '#007bff',
 *       textColor: '#333333'
 *     }
 *   };
 * </script>
 * <script src="https://your-domain.com/chat-widget.js"></script>
 */

(function () {
  'use strict';

  // Default configuration
  const defaultConfig = {
    apiUrl: 'http://192.168.1.13:4500/api', // Your fixed backend URL
    theme: {
      primaryColor: '#007bff',
      textColor: '#333333',
    },
    welcomeMessage: "Hi! I'm here to help you book an appointment. How can I assist you today?",
    placeholder: 'Type your message...',
    position: 'bottom-right', // bottom-right, bottom-left, top-right, top-left
    showBranding: true,
    bookingUrl: null, // Optional direct booking link
    enableAnalytics: true, // Track widget usage
    autoOpen: false, // Auto-open widget on page load
    openDelay: 0, // Delay before auto-opening (ms)
  };

  // Merge user config with defaults
  const config = Object.assign({}, defaultConfig, window.ChatWidgetConfig || {});

  if (!config.websiteUrl) {
    console.error('ChatWidget: websiteUrl is required');
    return;
  }

  // Get tenant configuration from backend based on website URL
  let tenantConfig = null;
  let sessionId = `web-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Fetch tenant configuration
  async function fetchTenantConfig() {
    try {
      const response = await fetch(`${config.apiUrl}/widget/config-by-domain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteUrl: config.websiteUrl,
          currentUrl: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tenant configuration');
      }

      const data = await response.json();
      if (data.success) {
        tenantConfig = data.data;
        // Update config with tenant-specific settings
        config.theme.primaryColor = tenantConfig.theme?.primaryColor || config.theme.primaryColor;
        config.welcomeMessage = tenantConfig.welcomeMessage || config.welcomeMessage;
        config.bookingUrl = tenantConfig.bookingUrl || config.bookingUrl;
        config.showBranding = tenantConfig.showBranding !== false;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error fetching tenant config:', error);
      return false;
    }
  }

  // Widget state
  let isOpen = false;
  let isMinimized = false;
  let messages = [];
  let conversationId = null;
  let isLoading = false;

  // Create widget HTML
  function createWidget() {
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'chat-widget-container';
    // Position widget based on config
    const positions = {
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;',
      'top-right': 'top: 20px; right: 20px;',
      'top-left': 'top: 20px; left: 20px;',
    };

    widgetContainer.style.cssText = `
      position: fixed;
      ${positions[config.position] || positions['bottom-right']}
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Add CSS styles
    const styles = document.createElement('style');
    styles.textContent = `
      #chat-widget-container * {
        box-sizing: border-box;
      }
      
      .chat-widget-button {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: box-shadow 0.2s ease;
      }
      
      .chat-widget-button:hover {
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }
      
      .chat-widget-window {
        width: 320px;
        height: 400px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        border: 1px solid #e1e5e9;
        display: flex;
        flex-direction: column;
        transition: all 0.2s ease;
      }
      
      .chat-widget-window.minimized {
        height: 48px;
      }
      
      .chat-widget-header {
        padding: 12px;
        border-radius: 8px 8px 0 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .chat-widget-title {
        color: white;
        font-weight: 500;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .chat-widget-controls {
        display: flex;
        gap: 4px;
      }
      
      .chat-widget-control-btn {
        width: 24px;
        height: 24px;
        border: none;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }
      
      .chat-widget-control-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .chat-widget-messages {
        flex: 1;
        padding: 12px;
        overflow-y: auto;
        background: #f8f9fa;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .chat-message {
        display: flex;
        max-width: 80%;
      }
      
      .chat-message.user {
        align-self: flex-end;
      }
      
      .chat-message.assistant {
        align-self: flex-start;
      }
      
      .chat-message-content {
        padding: 8px 12px;
        border-radius: 12px;
        font-size: 14px;
        line-height: 1.4;
        word-wrap: break-word;
      }
      
      .chat-message.user .chat-message-content {
        color: white;
      }
      
      .chat-message.assistant .chat-message-content {
        background: white;
        border: 1px solid #e1e5e9;
        color: #333;
      }
      
      .chat-message-time {
        font-size: 11px;
        margin-top: 4px;
        opacity: 0.7;
      }
      
      .chat-widget-input {
        padding: 12px;
        border-top: 1px solid #e1e5e9;
        background: white;
        border-radius: 0 0 8px 8px;
        display: flex;
        gap: 8px;
      }
      
      .chat-widget-textarea {
        flex: 1;
        border: 1px solid #e1e5e9;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 14px;
        resize: none;
        outline: none;
        font-family: inherit;
      }
      
      .chat-widget-textarea:focus {
        border-color: ${config.theme.primaryColor};
        box-shadow: 0 0 0 2px ${config.theme.primaryColor}20;
      }
      
      .chat-widget-send-btn {
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }
      
      .chat-widget-send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .chat-loading {
        display: flex;
        gap: 4px;
        padding: 8px 12px;
      }
      
      .chat-loading-dot {
        width: 6px;
        height: 6px;
        background: #999;
        border-radius: 50%;
        animation: chat-loading-bounce 1.4s ease-in-out infinite both;
      }
      
      .chat-loading-dot:nth-child(1) { animation-delay: -0.32s; }
      .chat-loading-dot:nth-child(2) { animation-delay: -0.16s; }
      
      @keyframes chat-loading-bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
    `;
    document.head.appendChild(styles);

    widgetContainer.innerHTML = createWidgetHTML();
    document.body.appendChild(widgetContainer);

    // Add event listeners
    setupEventListeners();

    // Initialize with welcome message
    addMessage('assistant', config.welcomeMessage);
  }

  function createWidgetHTML() {
    if (!isOpen) {
      return `
        <button class="chat-widget-button" style="background-color: ${config.theme.primaryColor}">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: white;">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      `;
    }

    return `
      <div class="chat-widget-window ${isMinimized ? 'minimized' : ''}">
        <div class="chat-widget-header" style="background-color: ${config.theme.primaryColor}">
          <div class="chat-widget-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Chat Assistant
          </div>
          <div class="chat-widget-controls">
            <button class="chat-widget-control-btn" data-action="minimize">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="4 14 10 14 10 20"></polyline>
                <polyline points="20 10 14 10 14 4"></polyline>
                <line x1="14" y1="10" x2="21" y2="3"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </button>
            <button class="chat-widget-control-btn" data-action="close">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        ${
          !isMinimized
            ? `
          <div class="chat-widget-messages" id="chat-messages">
            ${renderMessages()}
          </div>
          <div class="chat-widget-input">
            <textarea 
              class="chat-widget-textarea" 
              placeholder="${config.placeholder}"
              rows="1"
              id="chat-input"
            ></textarea>
            <button 
              class="chat-widget-send-btn" 
              style="background-color: ${config.theme.primaryColor}"
              id="chat-send-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9"></polygon>
              </svg>
            </button>
          </div>
          ${
            config.showBranding
              ? `
          <div style="padding: 8px 12px; border-top: 1px solid #e1e5e9; background: #f8f9fa; text-align: center; border-radius: 0 0 8px 8px;">
            <a href="https://your-domain.com" target="_blank" style="color: #666; text-decoration: none; font-size: 11px;">
              Powered by AI Assistant
            </a>
          </div>
          `
              : ''
          }
        `
            : ''
        }
      </div>
    `;
  }

  function renderMessages() {
    return (
      messages
        .map(
          (message) => `
      <div class="chat-message ${message.role}">
        <div>
          <div class="chat-message-content" ${message.role === 'user' ? `style="background-color: ${config.theme.primaryColor}"` : ''}>
            ${message.content.replace(/\n/g, '<br>')}
          </div>
          <div class="chat-message-time">
            ${formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    `
        )
        .join('') +
      (isLoading
        ? `
      <div class="chat-message assistant">
        <div class="chat-message-content">
          <div class="chat-loading">
            <div class="chat-loading-dot"></div>
            <div class="chat-loading-dot"></div>
            <div class="chat-loading-dot"></div>
          </div>
        </div>
      </div>
    `
        : '')
    );
  }

  function setupEventListeners() {
    const container = document.getElementById('chat-widget-container');

    container.addEventListener('click', function (e) {
      if (e.target.closest('.chat-widget-button')) {
        toggleWidget();
      } else if (e.target.closest('[data-action="close"]')) {
        closeWidget();
      } else if (e.target.closest('[data-action="minimize"]')) {
        toggleMinimize();
      } else if (e.target.closest('#chat-send-btn')) {
        sendMessage();
      }
    });

    container.addEventListener('keypress', function (e) {
      if (e.target.id === 'chat-input' && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  function toggleWidget() {
    isOpen = !isOpen;
    updateWidget();
  }

  function closeWidget() {
    isOpen = false;
    updateWidget();
  }

  function toggleMinimize() {
    isMinimized = !isMinimized;
    updateWidget();
  }

  function updateWidget() {
    const container = document.getElementById('chat-widget-container');
    container.innerHTML = createWidgetHTML();
    setupEventListeners();

    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }

  function addMessage(role, content) {
    messages.push({
      role,
      content,
      timestamp: new Date(),
    });

    if (isOpen && !isMinimized) {
      updateMessagesDisplay();
    }
  }

  function updateMessagesDisplay() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = renderMessages();
      scrollToBottom();
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      const messagesContainer = document.getElementById('chat-messages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  }

  async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message || isLoading) return;

    addMessage('user', message);
    input.value = '';
    isLoading = true;
    updateMessagesDisplay();

    try {
      const response = await fetch(`${config.apiUrl}/ai/public/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': config.tenantId,
        },
        body: JSON.stringify({
          message,
          conversationId,
          channel: 'web',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      if (data.success) {
        addMessage('assistant', data.data.message);

        if (data.data.conversationId && !conversationId) {
          conversationId = data.data.conversationId;
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      let fallbackMessage =
        "I'm currently unavailable, but I'd love to help you! Please feel free to browse our services or contact us directly if you need assistance.";

      // Add booking link if available
      if (config.bookingUrl) {
        fallbackMessage += ` You can also <a href="${config.bookingUrl}" target="_blank" style="color: ${config.theme.primaryColor}; text-decoration: underline;">book an appointment directly here</a>.`;
      }

      addMessage('assistant', fallbackMessage);
    } finally {
      isLoading = false;
      updateMessagesDisplay();
    }
  }

  function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // Initialize widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWidget);
  } else {
    initializeWidget();
  }

  async function initializeWidget() {
    // First fetch tenant configuration
    const configLoaded = await fetchTenantConfig();

    if (!configLoaded) {
      console.error(
        'ChatWidget: Failed to load tenant configuration for website:',
        config.websiteUrl
      );
      console.error('Please make sure your website domain is registered in your dashboard.');
      return;
    }

    createWidget();

    // Auto-open widget if configured
    if (config.autoOpen) {
      setTimeout(() => {
        if (!isOpen) {
          toggleWidget();
          trackEvent('widget_auto_opened');
        }
      }, config.openDelay);
    }
  }

  // Analytics tracking
  function trackEvent(event, data = {}) {
    if (!config.enableAnalytics) return;

    try {
      fetch(`${config.apiUrl}/widget/analytics/${config.tenantId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event,
          data: {
            ...data,
            url: window.location.href,
            referrer: document.referrer,
            timestamp: new Date().toISOString(),
          },
        }),
      }).catch(() => {}); // Silently fail analytics
    } catch (error) {
      // Silently fail analytics
    }
  }

  // Track widget initialization
  trackEvent('widget_loaded');

  // Enhanced toggle widget with analytics
  function toggleWidget() {
    isOpen = !isOpen;
    trackEvent(isOpen ? 'widget_opened' : 'widget_closed');
    updateWidget();
  }

  // Enhanced send message with analytics
  async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message || isLoading) return;

    trackEvent('message_sent', { messageLength: message.length });

    addMessage('user', message);
    input.value = '';
    isLoading = true;
    updateMessagesDisplay();

    try {
      const response = await fetch(`${config.apiUrl}/ai/public/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': config.tenantId,
        },
        body: JSON.stringify({
          message,
          conversationId,
          channel: 'web',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      if (data.success) {
        addMessage('assistant', data.data.message);
        trackEvent('message_received', { responseLength: data.data.message.length });

        if (data.data.conversationId && !conversationId) {
          conversationId = data.data.conversationId;
          trackEvent('conversation_started', { conversationId: data.data.conversationId });
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      trackEvent('message_error', { error: error.message });

      let fallbackMessage =
        "I'm currently unavailable, but I'd love to help you! Please feel free to browse our services or contact us directly if you need assistance.";

      // Add booking link if available
      if (config.bookingUrl) {
        fallbackMessage += ` You can also <a href="${config.bookingUrl}" target="_blank" style="color: ${config.theme.primaryColor}; text-decoration: underline;">book an appointment directly here</a>.`;
      }

      addMessage('assistant', fallbackMessage);
    } finally {
      isLoading = false;
      updateMessagesDisplay();
    }
  }

  // Expose API for external control
  window.ChatWidget = {
    open: function () {
      isOpen = true;
      isMinimized = false;
      trackEvent('widget_opened_programmatically');
      updateWidget();
    },
    close: function () {
      isOpen = false;
      trackEvent('widget_closed_programmatically');
      updateWidget();
    },
    minimize: function () {
      isMinimized = true;
      trackEvent('widget_minimized_programmatically');
      updateWidget();
    },
    sendMessage: function (message) {
      if (typeof message === 'string' && message.trim()) {
        addMessage('user', message.trim());
        trackEvent('message_sent_programmatically', { messageLength: message.length });
        // Process the message through the AI
        sendMessage();
      }
    },
    trackEvent: trackEvent, // Allow custom event tracking
  };
})();
