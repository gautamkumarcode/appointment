'use client';

import {
  Bot,
  Calendar,
  Clock,
  DollarSign,
  MessageSquare,
  Plus,
  Settings,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import StatsCard from '../../components/StatsCard';
import { useAuthStore } from '../../lib/auth-store';

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 px-8 py-12 shadow-xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">
                Welcome back, {user?.name}! 👋
              </h1>
              <p className="mt-2 text-lg text-blue-100">
                Your AI-powered appointment scheduler is ready to help you grow your business.
              </p>
            </div>
            <div className="hidden lg:block">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Bot className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Today's Appointments"
          value="12"
          icon={Calendar}
          change={{ value: '+3 from yesterday', type: 'increase' }}
          className="border-l-4 border-l-sky-500 bg-gradient-to-br from-sky-50 to-blue-50"
        />
        <StatsCard
          title="This Month's Revenue"
          value="$4,250"
          icon={DollarSign}
          change={{ value: '+18% from last month', type: 'increase' }}
          className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50 to-green-50"
        />
        <StatsCard
          title="Active Customers"
          value="156"
          icon={Users}
          change={{ value: '+23 new this month', type: 'increase' }}
          className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-indigo-50"
        />
        <StatsCard
          title="AI Conversations"
          value="89"
          icon={MessageSquare}
          change={{ value: '+45% engagement', type: 'increase' }}
          className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50 to-orange-50"
        />
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Primary Actions */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Quick Actions</h3>
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link
                href="/dashboard/appointments"
                className="group relative overflow-hidden rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 p-6 transition-all duration-300 hover:shadow-lg hover:shadow-sky-500/25"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-3 inline-flex rounded-lg bg-sky-500 p-3 text-white shadow-lg">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 group-hover:text-sky-700">
                      Manage Appointments
                    </h4>
                    <p className="mt-1 text-sm text-gray-600">
                      View, schedule, and manage all your appointments
                    </p>
                  </div>
                </div>
                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-sky-500/10"></div>
              </Link>

              <Link
                href="/dashboard/services"
                className="group relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-6 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-3 inline-flex rounded-lg bg-emerald-500 p-3 text-white shadow-lg">
                      <Settings className="h-6 w-6" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-700">
                      Service Management
                    </h4>
                    <p className="mt-1 text-sm text-gray-600">
                      Configure your services and pricing
                    </p>
                  </div>
                </div>
                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-emerald-500/10"></div>
              </Link>

              <Link
                href="/dashboard/customers"
                className="group relative overflow-hidden rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-6 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-3 inline-flex rounded-lg bg-purple-500 p-3 text-white shadow-lg">
                      <Users className="h-6 w-6" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 group-hover:text-purple-700">
                      Customer Directory
                    </h4>
                    <p className="mt-1 text-sm text-gray-600">Manage your customer relationships</p>
                  </div>
                </div>
                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-purple-500/10"></div>
              </Link>

              <Link
                href="/dashboard/analytics"
                className="group relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-3 inline-flex rounded-lg bg-amber-500 p-3 text-white shadow-lg">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 group-hover:text-amber-700">
                      Business Analytics
                    </h4>
                    <p className="mt-1 text-sm text-gray-600">Track performance and insights</p>
                  </div>
                </div>
                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-amber-500/10"></div>
              </Link>
            </div>
          </div>
        </div>

        {/* AI Assistant Panel */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">AI Assistant</h3>
              <Bot className="h-6 w-6 text-indigo-200" />
            </div>
            <p className="mb-4 text-sm text-indigo-100">
              Your AI is actively helping customers book appointments and answer questions.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-indigo-200">Active Conversations</span>
                <span className="font-semibold">5</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-indigo-200">Bookings Today</span>
                <span className="font-semibold">8</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-indigo-200">Response Rate</span>
                <span className="font-semibold">98%</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Today's Schedule</h3>
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 rounded-lg bg-sky-50 p-3">
                <div className="h-2 w-2 rounded-full bg-sky-500"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Hair Cut - John Doe</p>
                  <p className="text-xs text-gray-500">10:00 AM - 11:00 AM</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 rounded-lg bg-emerald-50 p-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Consultation - Jane Smith</p>
                  <p className="text-xs text-gray-500">2:00 PM - 2:30 PM</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 rounded-lg bg-purple-50 p-3">
                <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Massage - Mike Johnson</p>
                  <p className="text-xs text-gray-500">4:00 PM - 5:00 PM</p>
                </div>
              </div>
            </div>
            <Link
              href="/dashboard/appointments"
              className="mt-4 flex w-full items-center justify-center rounded-lg bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              View All Appointments
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Recent Activity</h3>
          <Link
            href="/dashboard/appointments"
            className="text-sm font-medium text-sky-600 hover:text-sky-700"
          >
            View all
          </Link>
        </div>
        <div className="space-y-4">
          <div className="flex items-center space-x-4 rounded-lg border border-gray-100 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Plus className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">New appointment booked</p>
              <p className="text-xs text-gray-500">
                Sarah Wilson booked a consultation for tomorrow at 3:00 PM
              </p>
            </div>
            <span className="text-xs text-gray-400">2 min ago</span>
          </div>
          <div className="flex items-center space-x-4 rounded-lg border border-gray-100 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">AI handled customer inquiry</p>
              <p className="text-xs text-gray-500">
                Answered questions about pricing and availability
              </p>
            </div>
            <span className="text-xs text-gray-400">5 min ago</span>
          </div>
          <div className="flex items-center space-x-4 rounded-lg border border-gray-100 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">New customer registered</p>
              <p className="text-xs text-gray-500">Alex Thompson joined your customer directory</p>
            </div>
            <span className="text-xs text-gray-400">15 min ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
