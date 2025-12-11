'use client';

import { Copy, ExternalLink, Eye, Palette, Settings, Zap } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface DemoConfig {
  name: string;
  tenantId: string;
  theme: {
    primaryColor: string;
    textColor: string;
  };
  welcomeMessage: string;
  description: string;
  features: string[];
}

type DemoConfigs = {
  [key: string]: DemoConfig;
};

export default function WidgetShowcasePage() {
  const [selectedDemo, setSelectedDemo] = useState<keyof DemoConfigs>('healthcare');

  const demoConfigs: DemoConfigs = {
    healthcare: {
      name: 'Healthcare Clinic',
      tenantId: 'demo-healthcare',
      theme: { primaryColor: '#10b981', textColor: '#333333' },
      welcomeMessage:
        "Hi! I'm here to help you schedule your medical appointment. What type of service do you need?",
      description: 'Perfect for medical practices, dental offices, and healthcare providers',
      features: [
        'Appointment scheduling',
        'Insurance verification',
        'Symptom assessment',
        'Doctor availability',
      ],
    },
    restaurant: {
      name: 'Fine Dining Restaurant',
      tenantId: 'demo-restaurant',
      theme: { primaryColor: '#f59e0b', textColor: '#333333' },
      welcomeMessage:
        'Welcome to our restaurant! I can help you make a reservation, check our menu, or answer any questions.',
      description: 'Ideal for restaurants, cafes, and food service businesses',
      features: ['Table reservations', 'Menu inquiries', 'Special dietary needs', 'Event bookings'],
    },
    salon: {
      name: 'Beauty Salon & Spa',
      tenantId: 'demo-salon',
      theme: { primaryColor: '#ec4899', textColor: '#333333' },
      welcomeMessage:
        'Hi beautiful! Ready to book your next appointment? I can help you find the perfect service and time slot.',
      description: 'Great for salons, spas, and beauty service providers',
      features: ['Service booking', 'Stylist selection', 'Package deals', 'Loyalty programs'],
    },
    fitness: {
      name: 'Fitness Studio',
      tenantId: 'demo-fitness',
      theme: { primaryColor: '#ef4444', textColor: '#333333' },
      welcomeMessage:
        'Ready to crush your fitness goals? Let me help you book a class or personal training session!',
      description: 'Perfect for gyms, yoga studios, and fitness centers',
      features: [
        'Class bookings',
        'Trainer scheduling',
        'Membership info',
        'Equipment availability',
      ],
    },
    consulting: {
      name: 'Business Consulting',
      tenantId: 'demo-consulting',
      theme: { primaryColor: '#3b82f6', textColor: '#333333' },
      welcomeMessage:
        "Hello! I'm here to help you schedule a consultation. What business challenges can we help you solve?",
      description: 'Suitable for consultants, coaches, and professional services',
      features: [
        'Consultation booking',
        'Service packages',
        'Expertise matching',
        'Follow-up scheduling',
      ],
    },
  };

  const currentDemo = demoConfigs[selectedDemo];

  const generateEmbedCode = (config: DemoConfig) => {
    return `<script>
  window.ChatWidgetConfig = {
    tenantId: '${config.tenantId}',
    apiUrl: 'https://your-domain.com/api',
    theme: {
      primaryColor: '${config.theme.primaryColor}',
      textColor: '${config.theme.textColor}'
    },
    welcomeMessage: "${config.welcomeMessage}",
    position: 'bottom-right',
    showBranding: true,
    enableAnalytics: true
  };
</script>
<script src="https://your-domain.com/chat-widget.js"></script>`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">AI Chat Widget Showcase</h1>
          <p className="mx-auto max-w-3xl text-xl text-gray-600">
            See how our AI chat widget adapts to different industries and use cases. Try the demos
            below and get inspired for your own implementation.
          </p>
        </div>

        {/* Features Grid */}
        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Easy Integration</h3>
            <p className="text-gray-600">
              Just copy and paste a simple code snippet into your website
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <Palette className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Custom Branding</h3>
            <p className="text-gray-600">Match your brand colors and customize messages</p>
          </div>

          <div className="rounded-lg bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
              <Settings className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Smart AI</h3>
            <p className="text-gray-600">
              Understands context and helps customers book appointments
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Demo Selector */}
          <div className="lg:col-span-1">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">Industry Demos</h2>
              <div className="space-y-3">
                {Object.entries(demoConfigs).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedDemo(key)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedDemo === key
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: config.theme.primaryColor }}
                      />
                      <div>
                        <div className="font-medium">{config.name}</div>
                        <div className="text-sm text-gray-500">{config.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Demo Preview */}
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-lg bg-white shadow-sm">
              {/* Demo Header */}
              <div
                className="px-6 py-4 text-white"
                style={{ backgroundColor: currentDemo.theme.primaryColor }}
              >
                <h3 className="text-lg font-semibold">{currentDemo.name}</h3>
                <p className="text-sm opacity-90">{currentDemo.description}</p>
              </div>

              {/* Demo Content */}
              <div className="p-6">
                <div className="mb-6">
                  <h4 className="mb-3 text-sm font-medium text-gray-900">Key Features:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {currentDemo.features.map((feature: string, index: number) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 text-sm text-gray-600"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="mb-3 text-sm font-medium text-gray-900">Welcome Message:</h4>
                  <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
                    "{currentDemo.welcomeMessage}"
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="mb-3 text-sm font-medium text-gray-900">Embed Code:</h4>
                  <div className="relative">
                    <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
                      <code>{generateEmbedCode(currentDemo)}</code>
                    </pre>
                    <button
                      onClick={() => copyToClipboard(generateEmbedCode(currentDemo))}
                      className="absolute right-2 top-2 rounded bg-gray-700 p-2 text-white hover:bg-gray-600"
                      title="Copy to clipboard"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <a
                    href={`/widget?tenantId=${currentDemo.tenantId}&primaryColor=${encodeURIComponent(currentDemo.theme.primaryColor)}&welcomeMessage=${encodeURIComponent(currentDemo.welcomeMessage)}`}
                    target="_blank"
                    className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Live Demo</span>
                  </a>

                  <Link
                    href="/widget-generator"
                    className="flex items-center space-x-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Customize</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 rounded-lg bg-white p-8 text-center shadow-sm">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">
            Ready to Add AI Chat to Your Website?
          </h2>
          <p className="mx-auto mb-6 max-w-2xl text-gray-600">
            Get started in minutes with our widget generator, or contact us for a custom
            implementation.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/widget-generator"
              className="inline-flex items-center space-x-2 rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
            >
              <Settings className="h-5 w-5" />
              <span>Create Your Widget</span>
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center space-x-2 rounded-lg border border-gray-300 px-6 py-3 text-gray-700 transition-colors hover:bg-gray-50"
            >
              <ExternalLink className="h-5 w-5" />
              <span>Get Started Free</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
