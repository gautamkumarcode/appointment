'use client';

import { Copy, Download, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api';
import { tenantApi } from '../../../lib/tenant-api';
import { Tenant } from '../../../types';

export default function WidgetGeneratorPage() {
  const [config, setConfig] = useState({
    websiteUrl: '',
    theme: {
      primaryColor: '#007bff',
      textColor: '#333333',
    },
    welcomeMessage: "Hi! I'm here to help you book an appointment. How can I assist you today?",
    placeholder: 'Type your message...',
    position: 'bottom-right',
    showBranding: true,
    bookingUrl: '',
  });

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('embed');

  // Load tenant information
  useEffect(() => {
    const loadTenant = async () => {
      try {
        setLoading(true);
        const data = await tenantApi.getTenant();
        setTenant(data);

        // Pre-populate config with tenant data
        setConfig((prev) => ({
          ...prev,
          theme: {
            ...prev.theme,
            primaryColor: data.primaryColor || prev.theme.primaryColor,
          },
          welcomeMessage: data.chatWelcomeMessage || prev.welcomeMessage,
          bookingUrl: data.bookingUrl || prev.bookingUrl,
          showBranding: data.showWidgetBranding !== false,
        }));
      } catch (error) {
        console.error('Failed to load tenant:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTenant();
  }, []);

  const generateEmbedCode = () => {
    if (!tenant || !config.websiteUrl) return '';

    const widgetConfig = {
      websiteUrl: config.websiteUrl,
      tenantId: tenant._id || tenant.id, // Include tenant ID for fallback
      theme: config.theme,
      welcomeMessage: config.welcomeMessage,
      placeholder: config.placeholder,
      position: config.position,
      showBranding: config.showBranding,
      bookingUrl: config.bookingUrl || null,
    };

    return `<!-- AI Chat Widget -->
<script>
  window.ChatWidgetConfig = ${JSON.stringify(widgetConfig, null, 2)};
</script>
<script src="${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://your-domain.com'}/chat-widget.js"></script>`;
  };

  const generateDirectLink = () => {
    if (!config.websiteUrl) return '';

    const params = new URLSearchParams({
      websiteUrl: config.websiteUrl,
      primaryColor: config.theme.primaryColor,
      welcomeMessage: config.welcomeMessage,
      position: config.position,
      showBranding: config.showBranding.toString(),
    });

    // Add tenant ID as fallback
    if (tenant) {
      const tenantId = tenant._id || tenant.id;
      if (tenantId) {
        params.append('tenantId', tenantId);
      }
    }

    if (config.bookingUrl) {
      params.append('bookingUrl', config.bookingUrl);
    }

    return `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://your-domain.com'}/widget?${params.toString()}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const registerDomain = async () => {
    if (!config.websiteUrl || !tenant) return;

    try {
      const response = await apiClient.post('/tenants/register-domain', {
        domain: config.websiteUrl,
      });

      if (response.status === 200) {
        console.log('Domain registered successfully');
      }
    } catch (error) {
      console.error('Failed to register domain:', error);
    }
  };

  // Register domain when websiteUrl changes
  useEffect(() => {
    if (config.websiteUrl && tenant) {
      registerDomain();
    }
  }, [config.websiteUrl, tenant]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-red-600">Failed to load tenant information</div>
        <button
          onClick={() => window.location.reload()}
          className="text-blue-600 hover:text-blue-800"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">AI Chat Widget Generator</h1>
          <p className="mt-2 text-lg text-gray-600">
            Generate your embeddable AI chat widget - just enter your website URL!
          </p>
          <div className="mt-4 rounded-lg bg-green-50 p-4">
            <p className="text-sm text-green-800">
              ✨ <strong>Simplified Setup:</strong> No more complex configuration! Just enter your
              website URL and get your embed code.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Configuration Panel */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">Widget Configuration</h2>

            <div className="space-y-6">
              {/* Configuration Status */}
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h4 className="mb-3 text-sm font-medium text-gray-900">Configuration Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`h-2 w-2 rounded-full ${tenant ? 'bg-green-500' : 'bg-yellow-500'}`}
                    ></div>
                    <span className="text-xs text-gray-600">
                      Account: {tenant ? 'Connected' : loading ? 'Loading...' : 'Error'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`h-2 w-2 rounded-full ${config.websiteUrl ? 'bg-green-500' : 'bg-red-500'}`}
                    ></div>
                    <span className="text-xs text-gray-600">
                      Website URL: {config.websiteUrl ? 'Configured' : 'Required'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`h-2 w-2 rounded-full ${config.bookingUrl ? 'bg-green-500' : 'bg-gray-300'}`}
                    ></div>
                    <span className="text-xs text-gray-600">
                      Booking URL: {config.bookingUrl ? 'Configured' : 'Optional'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Website URL */}
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                <label className="mb-2 block text-sm font-medium text-blue-900">
                  Your Website URL * (Required)
                </label>
                <input
                  type="url"
                  value={config.websiteUrl}
                  onChange={(e) => setConfig({ ...config, websiteUrl: e.target.value })}
                  className="w-full rounded-md border border-blue-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="https://yourbusiness.com"
                />
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-blue-800">
                    <strong>Enter your website domain where you'll install the widget</strong>
                  </p>
                  <p className="text-xs text-blue-700">
                    <strong>Examples:</strong>
                  </p>
                  <ul className="ml-4 list-disc text-xs text-blue-700">
                    <li>https://yourbusiness.com</li>
                    <li>https://www.yourbusiness.com</li>
                    <li>https://booking.yourbusiness.com</li>
                  </ul>
                  <p className="text-xs text-blue-700">
                    💡 This helps us prevent unauthorized use and ensures the widget works properly
                    on your site.
                  </p>
                </div>
              </div>

              {/* Theme */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Primary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={config.theme.primaryColor}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        theme: { ...config.theme, primaryColor: e.target.value },
                      })
                    }
                    className="h-10 w-16 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={config.theme.primaryColor}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        theme: { ...config.theme, primaryColor: e.target.value },
                      })
                    }
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Welcome Message */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Welcome Message
                </label>
                <textarea
                  value={config.welcomeMessage}
                  onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Position */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Widget Position
                </label>
                <select
                  value={config.position}
                  onChange={(e) => setConfig({ ...config, position: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                </select>
              </div>

              {/* Booking URL */}
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <label className="mb-2 block text-sm font-medium text-green-900">
                  Booking URL (Optional Fallback)
                </label>
                <input
                  type="url"
                  value={config.bookingUrl}
                  onChange={(e) => setConfig({ ...config, bookingUrl: e.target.value })}
                  className="w-full rounded-md border border-green-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder="https://your-booking-page.com"
                />
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-green-800">
                    <strong>What is Booking URL?</strong> A backup link shown when your AI system is
                    temporarily unavailable.
                  </p>
                  <p className="text-xs text-green-700">
                    <strong>Examples:</strong>
                  </p>
                  <ul className="ml-4 list-disc text-xs text-green-700">
                    <li>Calendly: https://calendly.com/yourbusiness</li>
                    <li>Your booking page: https://yourbusiness.com/book</li>
                    <li>Contact form: https://yourbusiness.com/contact</li>
                    <li>Phone booking: tel:+1234567890</li>
                  </ul>
                  <p className="text-xs text-green-700">
                    <strong>When is it used?</strong> If your API server is down or the AI fails,
                    customers will see a "Book directly" button with this link.
                  </p>
                  <p className="text-xs text-green-600">
                    💡 <strong>Tip:</strong> This ensures customers can always book appointments,
                    even if AI is unavailable.
                  </p>
                </div>
              </div>

              {/* Show Branding */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showBranding"
                  checked={config.showBranding}
                  onChange={(e) => setConfig({ ...config, showBranding: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="showBranding" className="ml-2 text-sm text-gray-700">
                  Show "Powered by" branding
                </label>
              </div>
            </div>
          </div>
          {/* Code Generation Panel */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Integration Code</h2>
              <div className="flex rounded-lg bg-gray-100 p-1">
                <button
                  onClick={() => setActiveTab('embed')}
                  className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                    activeTab === 'embed'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Embed Code
                </button>
                <button
                  onClick={() => setActiveTab('link')}
                  className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                    activeTab === 'link'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Direct Link
                </button>
              </div>
            </div>

            {activeTab === 'embed' && (
              <div>
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-medium text-gray-700">HTML Embed Code</h3>
                  <p className="text-sm text-gray-500">
                    Copy and paste this code before the closing &lt;/body&gt; tag of your website
                  </p>
                </div>

                <div className="relative">
                  <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
                    <code>{generateEmbedCode()}</code>
                  </pre>
                  <button
                    onClick={() => copyToClipboard(generateEmbedCode())}
                    className="absolute right-2 top-2 rounded bg-gray-700 p-2 text-white hover:bg-gray-600"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 rounded-lg bg-blue-50 p-4">
                  <h4 className="mb-2 text-sm font-medium text-blue-900">
                    Installation Instructions:
                  </h4>
                  <ol className="list-inside list-decimal space-y-1 text-sm text-blue-800">
                    <li>Enter your website URL above</li>
                    <li>Copy the generated code</li>
                    <li>Paste it before the closing &lt;/body&gt; tag in your HTML</li>
                    <li>The widget will appear automatically and connect to your account</li>
                  </ol>
                  <div className="mt-3 rounded bg-blue-100 p-3">
                    <p className="text-xs text-blue-800">
                      <strong>✨ No configuration needed!</strong> The widget automatically detects
                      your account based on your website domain.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'link' && (
              <div>
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-medium text-gray-700">Direct Widget Link</h3>
                  <p className="text-sm text-gray-500">
                    Use this link to embed the widget in an iframe or redirect users directly
                  </p>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={generateDirectLink()}
                    readOnly
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 pr-12 text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(generateDirectLink())}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-gray-200 p-1 hover:bg-gray-300"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="rounded-lg bg-green-50 p-4">
                    <h4 className="mb-2 text-sm font-medium text-green-900">iframe Integration:</h4>
                    <pre className="overflow-x-auto text-xs text-green-800">
                      {`<iframe 
  src="${generateDirectLink()}" 
  width="100%" 
  height="600" 
  frameborder="0">
</iframe>`}
                    </pre>
                  </div>

                  <div className="rounded-lg bg-purple-50 p-4">
                    <h4 className="mb-2 text-sm font-medium text-purple-900">Button Link:</h4>
                    <pre className="overflow-x-auto text-xs text-purple-800">
                      {`<a href="${generateDirectLink()}" target="_blank">
  Chat with us
</a>`}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => {
                  if (!config.websiteUrl) {
                    alert('Please enter your website URL first to preview the widget.');
                    return;
                  }
                  window.open(generateDirectLink(), '_blank');
                }}
                className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                disabled={!config.websiteUrl}
              >
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </button>

              <button
                onClick={() => {
                  const blob = new Blob([generateEmbedCode()], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'chat-widget-embed.html';
                  a.click();
                }}
                className="flex items-center space-x-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
