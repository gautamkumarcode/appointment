'use client';

import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon?: LucideIcon;
  children?: ReactNode;
  className?: string;
}

export default function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  children,
  className = '',
}: StatsCardProps) {
  return (
    <div
      className={`overflow-hidden rounded-lg border border-sky-100 bg-gradient-to-br from-white to-sky-50/30 shadow-md transition-all duration-200 hover:shadow-lg ${className}`}
    >
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {Icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600">
                <Icon className="h-5 w-5 text-white" />
              </div>
            )}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="truncate text-sm font-medium text-sky-600">{title}</dt>
              <dd className="flex items-baseline">
                <div className="bg-gradient-to-r from-sky-700 to-blue-700 bg-clip-text text-2xl font-semibold text-transparent">
                  {value}
                </div>
                {change && (
                  <div
                    className={`ml-2 flex items-baseline text-sm font-semibold ${
                      change.type === 'increase'
                        ? 'text-green-600'
                        : change.type === 'decrease'
                          ? 'text-red-600'
                          : 'text-gray-500'
                    }`}
                  >
                    {change.value}
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}
