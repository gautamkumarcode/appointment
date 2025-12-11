'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboardWithToast } from '@/lib/clipboard';
import { Copy, ExternalLink, Settings } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { tenantApi } from '../../../lib/tenant-api';
import { Tenant } from '../../../types';

export default function WidgetInfoPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const tenantData = await tenantApi.getTenant();
        setTenant(tenantData);
      } catch (error) {
        console.error('Failed to fetch tenant:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, []);

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
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-red-600">Failed to load tenant information</div>
      </div>
    );
  }

  const tenantId = tenant.id || tenant._id || '';

  const generateEmbedCode = () => {
    return `<script>
  window.ChatWidgetConfig = {
    tenantId: '${tenantId}',
    apiUrl: '${process.env.NEXT_PUBLIC_API_URL || 'https://your-domain.com/api'}',
    theme: {
      primaryColor: '${tenant.primaryColor || '#007bff'}',
      textColor: '#333333'
    },
    welcomeMessage: "${tenant.chatWelcomeMessage || "Hi! I'm here to help you book an appointment. How can I assist you today?"}",
    position: 'bottom-right',
    showBranding: ${tenant.showWidgetBranding !== false}
  };
</script>
<script src="${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://your-domain.com'}/chat-widget.js"></script>`;
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">Widget Information</h1>
          <p className="mt-2 text-sm text-gray-700">
            Everything you need to integrate the AI chat widget into your website.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {/* Tenant ID Card */}
        <div className="rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="mb-4 text-lg font-medium leading-6 text-gray-900">Your Tenant ID</h3>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">Tenant ID:</span>
                <Button
                  onClick={() =>
                    copyToClipboardWithToast(
                      tenant.id || tenant._id || '',
                      toast,
                      'Tenant ID copied to clipboard!',
                      'Failed to copy tenant ID'
                    )
                  }
                  variant="outline"
                  size="sm"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </div>
              <Input
                type="text"
                value={tenant.id || tenant._id || ''}
                readOnly
                className="border-blue-300 bg-white font-mono text-sm"
              />
              <p className="mt-2 text-xs text-blue-700">
                This unique identifier connects the chat widget to your account. Keep it secure!
              </p>
            </div>
          </div>
        </div>

        {/* Quick Setup Card */}
        <div className="rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="mb-4 text-lg font-medium leading-6 text-gray-900">Quick Setup Code</h3>
            <p className="mb-4 text-sm text-gray-600">
              Copy this code and paste it before the closing &lt;/body&gt; tag in your website:
            </p>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
                <code>{generateEmbedCode()}</code>
              </pre>
              <Button
                onClick={() =>
                  copyToClipboardWithToast(
                    generateEmbedCode(),
                    toast,
                    'Widget code copied to clipboard!',
                    'Failed to copy widget code'
                  )
                }
                size="sm"
                variant="outline"
                className="absolute right-2 top-2 bg-gray-700 text-gray-100 hover:bg-gray-600"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tools & Links */}
        <div className="rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="mb-4 text-lg font-medium leading-6 text-gray-900">Widget Tools</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/dashboard/widget-generator"
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50"
              >
                <div>
                  <div className="font-medium text-gray-900">Widget Generator</div>
                  <div className="text-sm text-gray-500">Visual configuration tool</div>
                </div>
                <ExternalLink className="h-5 w-5 text-gray-400" />
              </Link>

              <a
                href={`/widget?tenantId=${tenant.id || tenant._id}&primaryColor=${encodeURIComponent(tenant.primaryColor || '#007bff')}`}
                target="_blank"
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50"
              >
                <div>
                  <div className="font-medium text-gray-900">Live Preview</div>
                  <div className="text-sm text-gray-500">Test your widget</div>
                </div>
                <ExternalLink className="h-5 w-5 text-gray-400" />
              </a>

              <Link
                href="/dashboard/settings"
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50"
              >
                <div>
                  <div className="font-medium text-gray-900">Widget Settings</div>
                  <div className="text-sm text-gray-500">Customize messages & colors</div>
                </div>
                <Settings className="h-5 w-5 text-gray-400" />
              </Link>
            </div>
          </div>
        </div>

        {/* Integration Examples */}
        <div className="rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="mb-4 text-lg font-medium leading-6 text-gray-900">
              Integration Examples
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-sm font-medium text-gray-900">As an iframe:</h4>
                <div className="relative">
                  <pre className="overflow-x-auto rounded bg-gray-100 p-3 text-xs text-gray-800">
                    {`<iframe 
  src="${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://your-domain.com'}/widget?tenantId=${tenant._id}" 
  width="100%" 
  height="600" 
  frameborder="0">
</iframe>`}
                  </pre>
                  <Button
                    onClick={() =>
                      copyToClipboardWithToast(
                        `<iframe src="${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://your-domain.com'}/widget?tenantId=${tenant._id}" width="100%" height="600" frameborder="0"></iframe>`,
                        toast,
                        'iframe code copied!',
                        'Failed to copy iframe code'
                      )
                    }
                    size="sm"
                    variant="outline"
                    className="absolute right-2 top-2"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-medium text-gray-900">As a popup link:</h4>
                <div className="relative">
                  <pre className="overflow-x-auto rounded bg-gray-100 p-3 text-xs text-gray-800">
                    {`<a href="${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://your-domain.com'}/widget?tenantId=${tenant._id}" target="_blank">
  Chat with us
</a>`}
                  </pre>
                  <Button
                    onClick={() =>
                      copyToClipboardWithToast(
                        `<a href="${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://your-domain.com'}/widget?tenantId=${tenant._id}" target="_blank">Chat with us</a>`,
                        toast,
                        'Link code copied!',
                        'Failed to copy link code'
                      )
                    }
                    size="sm"
                    variant="outline"
                    className="absolute right-2 top-2"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
