'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const FullScreenChatWidget = dynamic(() => import('../../components/FullScreenChatWidget'), {
  ssr: false,
});

interface WidgetConfig {
  tenantId: string;
  theme: {
    primaryColor: string;
    textColor: string;
  };
  welcomeMessage: string;
  position: string;
  showBranding: boolean;
  bookingUrl: string | null;
}

export default function WidgetPage() {
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWidgetConfig = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if we have websiteUrl (new approach) or tenantId (old approach)
        const websiteUrl = searchParams.get('websiteUrl');
        const tenantId = searchParams.get('tenantId');

        if (websiteUrl) {
          // New approach: fetch config by website URL
          try {
            const response = await fetch('/api/widget/config-by-domain', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                websiteUrl,
                currentUrl: window.location.href,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to fetch widget configuration');
            }

            const data = await response.json();
            console.log('Widget page: Domain lookup response:', data);

            if (data.success) {
              const tenantConfig = data.data;
              console.log('Widget page: Received tenant config:', tenantConfig);

              const newConfig = {
                tenantId: tenantConfig.tenantId,
                theme: tenantConfig.theme,
                welcomeMessage: tenantConfig.welcomeMessage,
                position: searchParams.get('position') || 'bottom-right',
                showBranding: tenantConfig.showBranding,
                bookingUrl: tenantConfig.bookingUrl,
              };

              console.log('Widget page: Setting config with tenant ID:', newConfig.tenantId);
              setConfig(newConfig);
            } else {
              throw new Error(data.error || 'Failed to load widget configuration');
            }
          } catch (domainError) {
            // If domain lookup fails and we have a tenantId as fallback, try that
            const fallbackTenantId = searchParams.get('tenantId');
            if (fallbackTenantId) {
              console.warn('Domain lookup failed, falling back to tenant ID:', domainError);
              console.log('Widget page: Using fallback tenant ID:', fallbackTenantId);

              // Fall through to tenantId logic below
              const primaryColor = searchParams.get('primaryColor') || '#007bff';
              const welcomeMessage =
                searchParams.get('welcomeMessage') ||
                "Hi! I'm here to help you book an appointment. How can I assist you today?";
              const position = searchParams.get('position') || 'bottom-right';
              const showBranding = searchParams.get('showBranding') !== 'false';
              const bookingUrl = searchParams.get('bookingUrl');

              const fallbackConfig = {
                tenantId: fallbackTenantId,
                theme: {
                  primaryColor,
                  textColor: '#333333',
                },
                welcomeMessage,
                position,
                showBranding,
                bookingUrl,
              };

              console.log(
                'Widget page: Setting fallback config with tenant ID:',
                fallbackConfig.tenantId
              );
              setConfig(fallbackConfig);
            } else {
              throw domainError;
            }
          }
        } else if (tenantId) {
          // Old approach: use tenantId directly
          const primaryColor = searchParams.get('primaryColor') || '#007bff';
          const welcomeMessage =
            searchParams.get('welcomeMessage') ||
            "Hi! I'm here to help you book an appointment. How can I assist you today?";
          const position = searchParams.get('position') || 'bottom-right';
          const showBranding = searchParams.get('showBranding') !== 'false';
          const bookingUrl = searchParams.get('bookingUrl');

          setConfig({
            tenantId,
            theme: {
              primaryColor,
              textColor: '#333333',
            },
            welcomeMessage,
            position,
            showBranding,
            bookingUrl,
          });
        } else {
          throw new Error('Either websiteUrl or tenantId is required');
        }
      } catch (err) {
        console.error('Error loading widget config:', err);
        setError(err instanceof Error ? err.message : 'Failed to load widget');
      } finally {
        setLoading(false);
      }
    };

    fetchWidgetConfig();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <div className="mb-4 text-lg font-medium text-gray-600">Loading chat widget...</div>
          <div className="text-sm text-gray-500">Connecting to your business account...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mb-4 text-lg font-medium text-red-600">Widget Error</div>
          <div className="mb-4 text-sm text-gray-500">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mb-4 text-lg font-medium text-gray-600">No Configuration Found</div>
          <div className="text-sm text-gray-500">
            Please make sure you have provided a valid website URL or tenant ID
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50">
      {/* Full-screen chat interface */}
      <div className="flex h-full flex-col">
        <div className="border-b bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center space-x-3">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: config.theme.primaryColor }}
            />
            <h1 className="text-lg font-medium text-gray-900">Chat Assistant</h1>
          </div>
        </div>

        <div className="flex-1">
          <FullScreenChatWidget
            tenantId={config.tenantId}
            theme={config.theme}
            welcomeMessage={config.welcomeMessage}
            placeholder="Type your message..."
          />
        </div>

        {config.showBranding && (
          <div className="border-t bg-gray-50 px-4 py-2 text-center">
            <a
              href="https://your-domain.com"
              target="_blank"
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Powered by AI Assistant
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
