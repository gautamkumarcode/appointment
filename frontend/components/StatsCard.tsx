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
    <div className={`overflow-hidden rounded-lg bg-white shadow ${className}`}>
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">{Icon && <Icon className="h-6 w-6 text-gray-400" />}</div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="truncate text-sm font-medium text-gray-500">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
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
