'use client';

import {
  BarChart3,
  Briefcase,
  Calendar,
  ChevronLeft,
  Home,
  MessageCircle,
  Settings,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Appointments', href: '/dashboard/appointments', icon: Calendar },
  { name: 'Services', href: '/dashboard/services', icon: Briefcase },
  { name: 'Staff', href: '/dashboard/staff', icon: UserCheck },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Chat Widget', href: '/dashboard/widget-info', icon: MessageCircle },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
          <div className="relative flex h-full w-full max-w-xs flex-1 flex-col bg-white">
            <div className="absolute right-0 top-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={onClose}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <MobileSidebarContent pathname={pathname} onClose={onClose} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div
        className={cn(
          'z-20 hidden transition-all duration-300 ease-in-out lg:fixed lg:inset-y-0 lg:flex lg:flex-col',
          isCollapsed ? 'lg:w-16' : 'lg:w-64'
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <div className="flex flex-1 flex-col overflow-y-auto pb-4 pt-5">
            {/* Logo/Brand */}
            <div className="flex flex-shrink-0 items-center justify-between px-4">
              {!isCollapsed && (
                <div className="flex items-center space-x-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600">
                    <span className="text-sm font-bold text-white">AI</span>
                  </div>
                  <h1 className="bg-gradient-to-r from-sky-600 to-blue-700 bg-clip-text text-xl font-bold text-transparent">
                    Scheduler
                  </h1>
                </div>
              )}
              <button
                onClick={onToggleCollapse}
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <ChevronLeft
                  className={cn(
                    'h-5 w-5 transition-transform duration-200',
                    isCollapsed && 'rotate-180'
                  )}
                />
              </button>
            </div>

            {/* Navigation */}
            <nav className="mt-8 flex-1 space-y-1 px-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'border-r-4 border-sky-500 bg-gradient-to-r from-sky-50 to-blue-50 text-sky-700 shadow-sm'
                        : 'text-gray-600 hover:bg-gradient-to-r hover:from-sky-50 hover:to-blue-50 hover:text-sky-700',
                      isCollapsed ? 'justify-center' : ''
                    )}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <item.icon
                      className={cn(
                        'h-5 w-5 flex-shrink-0',
                        isActive ? 'text-sky-600' : 'text-gray-400 group-hover:text-sky-600',
                        !isCollapsed && 'mr-3'
                      )}
                    />
                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom section */}
          {!isCollapsed && (
            <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
              <div className="flex w-full items-center">
                <div className="flex-1">
                  <p className="truncate text-sm font-medium text-gray-700">Business Dashboard</p>
                  <p className="truncate text-xs text-gray-500">Manage your appointments</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function MobileSidebarContent({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col overflow-y-auto pb-4 pt-5">
        {/* Logo */}
        <div className="flex flex-shrink-0 items-center px-4">
          <h1 className="text-xl font-bold text-gray-900">AI Scheduler</h1>
        </div>

        {/* Navigation */}
        <nav className="mt-8 flex-1 space-y-1 px-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'group flex items-center rounded-md px-2 py-2 text-base font-medium',
                  isActive
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon
                  className={cn(
                    'mr-4 h-6 w-6 flex-shrink-0',
                    isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom section */}
      <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
        <div className="flex w-full items-center">
          <div className="flex-1">
            <p className="text-base font-medium text-gray-700">Business Dashboard</p>
            <p className="text-sm text-gray-500">Manage your appointments</p>
          </div>
        </div>
      </div>
    </div>
  );
}
