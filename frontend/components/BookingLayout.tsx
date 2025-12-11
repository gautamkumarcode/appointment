'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';
import { cn } from '../lib/utils';

const PublicChatWidget = dynamic(() => import('./PublicChatWidget'), {
  ssr: false,
});

interface TenantBranding {
  _id: string;
  businessName: string;
  logo?: string;
  primaryColor?: string;
}

interface BookingLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  step?: number;
  totalSteps?: number;
  className?: string;
  tenantBranding?: TenantBranding;
}

export function BookingLayout({
  children,
  title,
  subtitle,
  step,
  totalSteps,
  className,
  tenantBranding,
}: BookingLayoutProps) {
  const primaryColor = tenantBranding?.primaryColor || '#2563eb'; // Default to blue-600
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Branding Header */}
        {tenantBranding && (
          <div className="mb-6 text-center">
            {tenantBranding.logo && (
              <div className="mb-4">
                <img
                  src={tenantBranding.logo}
                  alt={tenantBranding.businessName}
                  className="mx-auto h-16 w-auto object-contain"
                />
              </div>
            )}
            <h2 className="text-2xl font-bold" style={{ color: primaryColor }}>
              {tenantBranding.businessName}
            </h2>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-2 text-lg text-gray-600">{subtitle}</p>}

          {/* Progress indicator */}
          {step && totalSteps && (
            <div className="mt-6">
              <div className="flex items-center justify-center space-x-2">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-2 w-8 rounded-full',
                      i < step ? 'bg-gray-300' : i === step - 1 ? 'bg-gray-300' : 'bg-gray-300'
                    )}
                    style={{
                      backgroundColor:
                        i < step
                          ? primaryColor
                          : i === step - 1
                            ? `${primaryColor}80` // 50% opacity
                            : '#d1d5db', // gray-300
                    }}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Step {step} of {totalSteps}
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className={cn('rounded-lg bg-white p-6 shadow-sm', className)}>{children}</div>
      </div>

      {/* Chat Widget */}
      {tenantBranding && (
        <PublicChatWidget
          tenantId={tenantBranding._id}
          theme={{
            primaryColor: primaryColor,
            textColor: '#333333',
          }}
          welcomeMessage="Hi! I'm here to help you book an appointment. How can I assist you today?"
          placeholder="Ask me anything about booking..."
        />
      )}
    </div>
  );
}
