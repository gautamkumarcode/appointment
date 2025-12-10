'use client';

import { endOfMonth, endOfYear, format, startOfMonth, startOfYear, subMonths } from 'date-fns';
import { AlertTriangle, Calendar, DollarSign, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { analyticsApi, AnalyticsData } from '../../../lib/analytics-api';

type DateRange = 'this-month' | 'last-month' | 'this-year' | 'custom';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('this-month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, customStartDate, customEndDate]);

  const getDateFilters = () => {
    const now = new Date();

    switch (dateRange) {
      case 'this-month':
        return {
          startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
        };
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        return {
          startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
        };
      case 'this-year':
        return {
          startDate: format(startOfYear(now), 'yyyy-MM-dd'),
          endDate: format(endOfYear(now), 'yyyy-MM-dd'),
        };
      case 'custom':
        return {
          startDate: customStartDate,
          endDate: customEndDate,
        };
      default:
        return {};
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters = getDateFilters();

      if (dateRange === 'custom' && (!customStartDate || !customEndDate)) {
        return;
      }

      const data = await analyticsApi.getAllAnalytics(filters);
      setAnalytics(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case 'this-month':
        return 'This Month';
      case 'last-month':
        return 'Last Month';
      case 'this-year':
        return 'This Year';
      case 'custom':
        return customStartDate && customEndDate
          ? `${customStartDate} to ${customEndDate}`
          : 'Custom Range';
      default:
        return '';
    }
  };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">Analytics</h1>
          <p className="mt-2 text-sm text-gray-700">View your business performance and insights.</p>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="mt-6 rounded-lg bg-white p-4 shadow">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: 'this-month', label: 'This Month' },
              { value: 'last-month', label: 'Last Month' },
              { value: 'this-year', label: 'This Year' },
              { value: 'custom', label: 'Custom' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value as DateRange)}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  dateRange === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {dateRange === 'custom' && (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          )}
        </div>

        <div className="mt-2 text-sm text-gray-600">
          Showing data for: <span className="font-medium">{getDateRangeLabel()}</span>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {loading ? (
        <div className="mt-8 flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        </div>
      ) : analytics ? (
        <div className="mt-8 space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="overflow-hidden rounded-lg bg-white shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-gray-500">Total Bookings</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {analytics.bookings.totalBookings}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg bg-white shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-gray-500">Total Revenue</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {formatCurrency(analytics.revenue.totalRevenue)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg bg-white shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-gray-500">
                        Total Customers
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {analytics.customers.totalCustomers}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg bg-white shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-gray-500">No-Show Rate</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {formatPercentage(analytics.noShows.rate)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Booking Breakdown */}
            <div className="rounded-lg bg-white shadow">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="mb-4 text-lg font-medium leading-6 text-gray-900">
                  Booking Breakdown
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Confirmed</span>
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-24 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-blue-600"
                          style={{
                            width: `${
                              analytics.bookings.totalBookings > 0
                                ? (analytics.bookings.confirmedBookings /
                                    analytics.bookings.totalBookings) *
                                  100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {analytics.bookings.confirmedBookings}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Completed</span>
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-24 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-green-600"
                          style={{
                            width: `${
                              analytics.bookings.totalBookings > 0
                                ? (analytics.bookings.completedBookings /
                                    analytics.bookings.totalBookings) *
                                  100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {analytics.bookings.completedBookings}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cancelled</span>
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-24 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-red-600"
                          style={{
                            width: `${
                              analytics.bookings.totalBookings > 0
                                ? (analytics.bookings.cancelledBookings /
                                    analytics.bookings.totalBookings) *
                                  100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {analytics.bookings.cancelledBookings}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">No Shows</span>
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-24 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-yellow-600"
                          style={{
                            width: `${
                              analytics.bookings.totalBookings > 0
                                ? (analytics.bookings.noShowBookings /
                                    analytics.bookings.totalBookings) *
                                  100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {analytics.bookings.noShowBookings}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Breakdown */}
            <div className="rounded-lg bg-white shadow">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="mb-4 text-lg font-medium leading-6 text-gray-900">
                  Revenue Breakdown
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Paid Revenue</span>
                    <span className="text-sm font-medium text-green-600">
                      {formatCurrency(analytics.revenue.paidRevenue)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Unpaid Revenue</span>
                    <span className="text-sm font-medium text-yellow-600">
                      {formatCurrency(analytics.revenue.unpaidRevenue)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Refunded Revenue</span>
                    <span className="text-sm font-medium text-red-600">
                      {formatCurrency(analytics.revenue.refundedRevenue)}
                    </span>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-medium text-gray-900">Total Revenue</span>
                      <span className="text-base font-medium text-gray-900">
                        {formatCurrency(analytics.revenue.totalRevenue)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Insights */}
            <div className="rounded-lg bg-white shadow">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="mb-4 text-lg font-medium leading-6 text-gray-900">
                  Customer Insights
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Customers</span>
                    <span className="text-sm font-medium text-gray-900">
                      {analytics.customers.totalCustomers}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">New Customers</span>
                    <span className="text-sm font-medium text-blue-600">
                      {analytics.customers.newCustomers}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Repeat Customers</span>
                    <span className="text-sm font-medium text-green-600">
                      {analytics.customers.repeatCustomers}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Repeat Customer Rate</span>
                    <span className="text-sm font-medium text-purple-600">
                      {formatPercentage(analytics.customers.repeatCustomerRate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* No-Show Analysis */}
            <div className="rounded-lg bg-white shadow">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="mb-4 text-lg font-medium leading-6 text-gray-900">
                  No-Show Analysis
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total No-Shows</span>
                    <span className="text-sm font-medium text-red-600">
                      {analytics.noShows.count}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">No-Show Rate</span>
                    <span className="text-sm font-medium text-red-600">
                      {formatPercentage(analytics.noShows.rate)}
                    </span>
                  </div>

                  <div className="mt-4 rounded-md bg-yellow-50 p-3">
                    <p className="text-sm text-yellow-800">
                      {analytics.noShows.rate > 0.1
                        ? 'Consider implementing reminder notifications to reduce no-shows.'
                        : 'Great job! Your no-show rate is low.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
