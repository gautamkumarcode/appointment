'use client';

import { format, parseISO } from 'date-fns';
import { ArrowLeft, Calendar, Clock, Mail, MapPin, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { customerApi } from '../../../../lib/customer-api';
import { Appointment, Customer } from '../../../../types';

interface CustomerProfilePageProps {
  params: {
    id: string;
  };
}

export default function CustomerProfilePage({ params }: CustomerProfilePageProps) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCustomerData();
  }, [params.id]);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      const [customerData, appointmentHistory] = await Promise.all([
        customerApi.getCustomer(params.id),
        customerApi.getCustomerHistory(params.id),
      ]);
      setCustomer(customerData);
      setAppointments(appointmentHistory);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAppointmentStats = () => {
    const total = appointments.length;
    const completed = appointments.filter((apt) => apt.status === 'completed').length;
    const cancelled = appointments.filter((apt) => apt.status === 'cancelled').length;
    const noShows = appointments.filter((apt) => apt.status === 'no-show').length;
    const totalRevenue = appointments
      .filter((apt) => apt.status === 'completed' && apt.paymentStatus === 'paid')
      .reduce((sum, apt) => sum + (apt.amount || 0), 0);

    return { total, completed, cancelled, noShows, totalRevenue };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-red-600">{error || 'Customer not found'}</div>
        <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-800">
          Go back
        </button>
      </div>
    );
  }

  const stats = getAppointmentStats();

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Customers
        </button>

        <div className="flex items-start space-x-4">
          <div className="h-16 w-16 flex-shrink-0">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <span className="text-xl font-medium text-blue-700">
                {getInitials(customer.name)}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <div className="mt-2 space-y-1">
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="mr-2 h-4 w-4" />
                {customer.email}
              </div>
              {customer.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="mr-2 h-4 w-4" />
                  {customer.phone}
                </div>
              )}
              {customer.timezone && (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="mr-2 h-4 w-4" />
                  {customer.timezone}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">Total Appointments</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                  <span className="text-sm font-medium text-green-600">✓</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">Completed</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.completed}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100">
                  <span className="text-sm font-medium text-red-600">✕</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">Cancelled</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.cancelled}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100">
                  <span className="text-sm font-medium text-yellow-600">!</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">No Shows</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.noShows}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                  <span className="text-sm font-medium text-green-600">$</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">Total Revenue</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(stats.totalRevenue)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment History */}
      <div className="rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="mb-4 text-lg font-medium leading-6 text-gray-900">Appointment History</h3>

          {appointments.length === 0 ? (
            <div className="py-8 text-center">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No appointments</h3>
              <p className="mt-1 text-sm text-gray-500">
                This customer hasn't made any appointments yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments
                .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                .map((appointment) => (
                  <div key={appointment._id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center space-x-3">
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="mr-1 h-4 w-4" />
                            {format(parseISO(appointment.startTime), 'MMM d, yyyy • h:mm a')}
                          </div>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              appointment.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : appointment.status === 'confirmed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : appointment.status === 'cancelled'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {appointment.status.charAt(0).toUpperCase() +
                              appointment.status.slice(1)}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900">
                            {appointment.service?.name}
                          </div>
                          {appointment.staff && (
                            <div className="text-sm text-gray-600">
                              with {appointment.staff.name}
                            </div>
                          )}
                          {appointment.amount && (
                            <div className="flex items-center text-sm text-gray-600">
                              <span>{formatCurrency(appointment.amount)}</span>
                              <span className="ml-2">
                                (
                                {appointment.paymentOption === 'prepaid'
                                  ? 'Prepaid'
                                  : 'Pay at venue'}
                                )
                              </span>
                              <span
                                className={`ml-2 rounded-full px-2 py-1 text-xs ${
                                  appointment.paymentStatus === 'paid'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {appointment.paymentStatus}
                              </span>
                            </div>
                          )}
                          {appointment.notes && (
                            <div className="mt-2 text-sm text-gray-500">
                              <span className="font-medium">Notes:</span> {appointment.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
