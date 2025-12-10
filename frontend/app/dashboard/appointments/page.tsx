'use client';

import { addDays, endOfWeek, format, isSameDay, parseISO, startOfWeek } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Filter, List } from 'lucide-react';
import { useEffect, useState } from 'react';
import { appointmentApi, AppointmentFilters } from '../../../lib/appointment-api';
import { customerApi } from '../../../lib/customer-api';
import { staffApi } from '../../../lib/staff-api';
import { Appointment, AppointmentStatus, Customer, Staff } from '../../../types';
import AppointmentCard from './AppointmentCard';
import AppointmentModal from './AppointmentModal';

type ViewMode = 'calendar' | 'list';
type CalendarView = 'day' | 'week';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [calendarView, setCalendarView] = useState<CalendarView>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [filters, setFilters] = useState<AppointmentFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);

  useEffect(() => {
    loadAppointments();
    loadFilterData();
  }, [currentDate, filters]);

  const loadFilterData = async () => {
    try {
      const [customersData, staffData] = await Promise.all([
        customerApi.getCustomers(),
        staffApi.getStaff(),
      ]);
      setCustomers(customersData);
      setStaff(staffData);
    } catch (err) {
      console.error('Failed to load filter data:', err);
    }
  };

  const loadAppointments = async () => {
    try {
      setLoading(true);

      // Set date range based on view mode
      let dateFilters: Partial<AppointmentFilters> = {};
      if (viewMode === 'calendar') {
        if (calendarView === 'week') {
          const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
          dateFilters = {
            startDate: format(weekStart, 'yyyy-MM-dd'),
            endDate: format(weekEnd, 'yyyy-MM-dd'),
          };
        } else {
          // Day view
          dateFilters = {
            startDate: format(currentDate, 'yyyy-MM-dd'),
            endDate: format(currentDate, 'yyyy-MM-dd'),
          };
        }
      } else {
        // List view - only apply date filters if explicitly set by user
        if (!filters.startDate && !filters.endDate) {
          // Show upcoming appointments (from today onwards) if no date filters are set
          dateFilters = {
            startDate: format(new Date(), 'yyyy-MM-dd'),
          };
        }
      }

      const data = await appointmentApi.getAppointments({ ...filters, ...dateFilters });
      setAppointments(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (viewMode === 'calendar') {
      if (calendarView === 'week') {
        setCurrentDate(addDays(currentDate, -7));
      } else {
        setCurrentDate(addDays(currentDate, -1));
      }
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'calendar') {
      if (calendarView === 'week') {
        setCurrentDate(addDays(currentDate, 7));
      } else {
        setCurrentDate(addDays(currentDate, 1));
      }
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleAppointmentUpdate = (updatedAppointment: Appointment) => {
    setAppointments(
      appointments.map((apt) => (apt._id === updatedAppointment._id ? updatedAppointment : apt))
    );
    setSelectedAppointment(null);
  };

  const handleAppointmentDelete = (appointmentId: string) => {
    setAppointments(appointments.filter((apt) => apt._id !== appointmentId));
    setSelectedAppointment(null);
  };

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter((apt) => isSameDay(parseISO(apt.startTime), date));
  };

  const getWeekDays = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">Appointments</h1>
          <p className="mt-2 text-sm text-gray-700">Manage your appointments and calendar.</p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </button>
            {viewMode === 'calendar' && (
              <div className="flex rounded-md shadow-sm">
                <button
                  onClick={() => setCalendarView('day')}
                  className={`rounded-l-md border px-3 py-2 text-sm font-medium ${
                    calendarView === 'day'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setCalendarView('week')}
                  className={`rounded-r-md border-b border-r border-t px-3 py-2 text-sm font-medium ${
                    calendarView === 'week'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Week
                </button>
              </div>
            )}
            <div className="flex rounded-md shadow-sm">
              <button
                onClick={() => setViewMode('calendar')}
                className={`rounded-l-md border px-3 py-2 text-sm font-medium ${
                  viewMode === 'calendar'
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Calendar className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`rounded-r-md border-b border-r border-t px-3 py-2 text-sm font-medium ${
                  viewMode === 'list'
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    status: (e.target.value as AppointmentStatus) || undefined,
                  })
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no-show">No Show</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Customer</label>
              <select
                value={filters.customerId || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    customerId: e.target.value || undefined,
                  })
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">All Customers</option>
                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Staff</label>
              <select
                value={filters.staffId || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    staffId: e.target.value || undefined,
                  })
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">All Staff</option>
                {staff.map((staffMember) => (
                  <option key={staffMember._id} value={staffMember._id}>
                    {staffMember.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({})}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      {viewMode === 'calendar' && (
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={handlePrevious} className="p-2 text-gray-400 hover:text-gray-600">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {calendarView === 'week'
                ? `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
                : format(currentDate, 'EEEE, MMMM d, yyyy')}
            </h2>
            <button onClick={handleNext} className="p-2 text-gray-400 hover:text-gray-600">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={handleToday}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Today
          </button>
        </div>
      )}

      {/* List View Header */}
      {viewMode === 'list' && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {filters.startDate ||
            filters.endDate ||
            filters.status ||
            filters.customerId ||
            filters.staffId
              ? 'Filtered Appointments'
              : 'Upcoming Appointments'}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {filters.startDate ||
            filters.endDate ||
            filters.status ||
            filters.customerId ||
            filters.staffId
              ? 'Appointments matching your selected filters'
              : 'All upcoming appointments sorted by date and time'}
          </p>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && calendarView === 'week' && (
        <div className="mt-6 overflow-hidden rounded-lg bg-white shadow">
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="bg-gray-50 px-3 py-2">
                <div className="text-center text-sm font-medium text-gray-900">{day}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {getWeekDays().map((day) => {
              const dayAppointments = getAppointmentsForDay(day);
              const isToday = isSameDay(day, new Date());

              return (
                <div key={day.toISOString()} className="min-h-32 bg-white p-2">
                  <div
                    className={`mb-2 text-sm font-medium ${
                      isToday ? 'text-blue-600' : 'text-gray-900'
                    }`}
                  >
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayAppointments.map((appointment) => (
                      <div
                        key={appointment._id}
                        onClick={() => setSelectedAppointment(appointment)}
                        className="cursor-pointer truncate rounded p-1 text-xs hover:opacity-80"
                        style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}
                      >
                        <div className="font-medium">
                          {format(parseISO(appointment.startTime), 'HH:mm')}
                        </div>
                        <div className="truncate">{appointment.customer?.name}</div>
                        <div className="truncate">{appointment.service?.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day View */}
      {viewMode === 'calendar' && calendarView === 'day' && (
        <div className="mt-6 overflow-hidden rounded-lg bg-white shadow">
          <div className="bg-gray-50 px-4 py-3">
            <h3 className="text-lg font-medium text-gray-900">
              {format(currentDate, 'EEEE, MMMM d, yyyy')}
            </h3>
          </div>
          <div className="p-4">
            {getAppointmentsForDay(currentDate).length === 0 ? (
              <div className="py-12 text-center">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No appointments</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No appointments scheduled for this day.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {getAppointmentsForDay(currentDate)
                  .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime())
                  .map((appointment) => (
                    <div
                      key={appointment._id}
                      onClick={() => setSelectedAppointment(appointment)}
                      className="cursor-pointer rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-sm font-medium text-gray-900">
                            {format(parseISO(appointment.startTime), 'h:mm a')} -{' '}
                            {format(parseISO(appointment.endTime), 'h:mm a')}
                          </div>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              appointment.status === 'confirmed'
                                ? 'bg-blue-100 text-blue-800'
                                : appointment.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : appointment.status === 'cancelled'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {appointment.status.charAt(0).toUpperCase() +
                              appointment.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="text-sm font-medium text-gray-900">
                          {appointment.customer?.name}
                        </div>
                        <div className="text-sm text-gray-600">{appointment.service?.name}</div>
                        {appointment.staff && (
                          <div className="text-sm text-gray-500">with {appointment.staff.name}</div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="mt-6 space-y-4">
          {appointments.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No appointments</h3>
              <p className="mt-1 text-sm text-gray-500">
                No appointments found for the selected criteria.
              </p>
            </div>
          ) : (
            appointments
              .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime())
              .map((appointment) => (
                <AppointmentCard
                  key={appointment._id}
                  appointment={appointment}
                  onClick={() => setSelectedAppointment(appointment)}
                />
              ))
          )}
        </div>
      )}

      {/* Appointment Modal */}
      {selectedAppointment && (
        <AppointmentModal
          appointment={selectedAppointment}
          onUpdate={handleAppointmentUpdate}
          onDelete={handleAppointmentDelete}
          onClose={() => setSelectedAppointment(null)}
        />
      )}
    </div>
  );
}
