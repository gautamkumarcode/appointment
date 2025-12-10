'use client';

import { addDays, format, parseISO } from 'date-fns';
import { Calendar, Clock, Edit, Mail, Phone, RotateCcw, Trash2, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { appointmentApi, type TimeSlot } from '../../../lib/appointment-api';
import { Appointment, AppointmentStatus } from '../../../types';

interface AppointmentModalProps {
  appointment: Appointment;
  onUpdate: (appointment: Appointment) => void;
  onDelete: (appointmentId: string) => void;
  onClose: () => void;
}

export default function AppointmentModal({
  appointment,
  onUpdate,
  onDelete,
  onClose,
}: AppointmentModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AppointmentStatus>(appointment.status);
  const [notes, setNotes] = useState(appointment.notes || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(
    format(addDays(parseISO(appointment.startTime), 1), 'yyyy-MM-dd')
  );

  const handleUpdateStatus = async () => {
    if (status === appointment.status && notes === (appointment.notes || '')) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updatedAppointment = await appointmentApi.updateAppointment(appointment._id, {
        status,
        notes: notes || undefined,
      });
      onUpdate(updatedAppointment);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update appointment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await appointmentApi.cancelAppointment(appointment._id);
      onDelete(appointment._id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel appointment');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    if (!isRescheduling) return;

    setIsLoading(true);
    setError(null);

    try {
      const slots = await appointmentApi.getAvailableSlots({
        serviceId: appointment.service!._id,
        staffId: appointment.staff?._id,
        date: rescheduleDate,
        timezone: appointment.customerTimezone || 'UTC',
      });
      setAvailableSlots(slots);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load available slots');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedSlot) return;

    setIsLoading(true);
    setError(null);

    try {
      const updatedAppointment = await appointmentApi.rescheduleAppointment(appointment._id, {
        newStartTime: selectedSlot.startTime,
        newEndTime: selectedSlot.endTime,
      });
      onUpdate(updatedAppointment);
      setIsRescheduling(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reschedule appointment');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isRescheduling) {
      loadAvailableSlots();
    }
  }, [isRescheduling, rescheduleDate]);

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no-show':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600 bg-opacity-50">
      <div className="relative top-20 mx-auto w-full max-w-2xl rounded-md border bg-white p-5 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Appointment Details</h3>
          <div className="flex items-center space-x-2">
            {!isEditing && !isRescheduling && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Edit Appointment"
                >
                  <Edit className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setIsRescheduling(true)}
                  className="text-green-600 hover:text-green-800"
                  title="Reschedule Appointment"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 hover:text-red-800"
                  title="Cancel Appointment"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="space-y-6">
          {/* Appointment Time */}
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {format(parseISO(appointment.startTime), 'EEEE, MMMM d, yyyy')}
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="mr-1 h-4 w-4" />
                {format(parseISO(appointment.startTime), 'h:mm a')} -{' '}
                {format(parseISO(appointment.endTime), 'h:mm a')}
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-900">Customer</h4>
            <div className="space-y-2 rounded-lg bg-gray-50 p-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">
                  {appointment.customer?.name}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">{appointment.customer?.email}</span>
              </div>
              {appointment.customer?.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{appointment.customer.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Service Information */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-900">Service</h4>
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="text-sm font-medium text-gray-900">{appointment.service?.name}</div>
              {appointment.service?.description && (
                <div className="mt-1 text-sm text-gray-600">{appointment.service.description}</div>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Duration: {appointment.service?.durationMinutes} minutes
                </span>
                {appointment.amount && (
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(appointment.amount, 'USD')}
                  </span>
                )}
              </div>
              {appointment.staff && (
                <div className="mt-1 text-sm text-gray-600">Staff: {appointment.staff.name}</div>
              )}
            </div>
          </div>

          {/* Payment Information */}
          {appointment.amount && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-900">Payment</h4>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {appointment.paymentOption === 'prepaid' ? 'Prepaid' : 'Pay at venue'}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      appointment.paymentStatus === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {appointment.paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Status and Notes */}
          {!isRescheduling && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-900">Status & Notes</h4>
              <div className="space-y-3">
                {isEditing ? (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no-show">No Show</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="Add notes about this appointment..."
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(appointment.status)}`}
                      >
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                    </div>
                    {appointment.notes && (
                      <div>
                        <span className="text-sm text-gray-600">Notes:</span>
                        <div className="mt-1 rounded bg-gray-50 p-2 text-sm text-gray-900">
                          {appointment.notes}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Reschedule Section */}
          {isRescheduling && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-900">Reschedule Appointment</h4>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                {availableSlots.length > 0 && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Available Time Slots
                    </label>
                    <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto">
                      {availableSlots.map((slot, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedSlot(slot)}
                          className={`rounded-md border p-2 text-sm ${
                            selectedSlot === slot
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {format(parseISO(slot.startTime), 'h:mm a')} -{' '}
                          {format(parseISO(slot.endTime), 'h:mm a')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {availableSlots.length === 0 && !isLoading && (
                  <div className="rounded-md bg-yellow-50 p-4">
                    <div className="text-sm text-yellow-700">
                      No available slots found for the selected date. Please try a different date.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end space-x-3 border-t pt-6">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setStatus(appointment.status);
                  setNotes(appointment.notes || '');
                  setError(null);
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={isLoading}
                className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : isRescheduling ? (
            <>
              <button
                onClick={() => {
                  setIsRescheduling(false);
                  setSelectedSlot(null);
                  setAvailableSlots([]);
                  setError(null);
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                disabled={isLoading || !selectedSlot}
                className="rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Rescheduling...' : 'Reschedule Appointment'}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Close
            </button>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="z-60 fixed inset-0 h-full w-full overflow-y-auto bg-gray-600 bg-opacity-50">
            <div className="relative top-20 mx-auto w-96 rounded-md border bg-white p-5 shadow-lg">
              <div className="mt-3 text-center">
                <h3 className="text-lg font-medium text-gray-900">Cancel Appointment</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to cancel this appointment? This action cannot be undone.
                  </p>
                </div>
                <div className="flex justify-center space-x-4 px-4 py-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-md bg-gray-300 px-4 py-2 text-base font-medium text-gray-800 shadow-sm hover:bg-gray-400"
                  >
                    Keep Appointment
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="rounded-md bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? 'Cancelling...' : 'Cancel Appointment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
