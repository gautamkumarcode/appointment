'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { addDays, format, isSameDay, startOfDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { AlertCircle, ArrowRight, Calendar, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BookingLayout } from '../../../../../components/BookingLayout';
import { bookingApi, TimeSlot } from '../../../../../lib/booking-api';
import { cn, formatDuration } from '../../../../../lib/utils';

export default function ReschedulePage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;
  const rescheduleToken = params.token as string;

  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Generate available dates (next 30 days)
  useEffect(() => {
    const dates = [];
    const today = startOfDay(new Date());
    for (let i = 0; i < 30; i++) {
      dates.push(addDays(today, i));
    }
    setAvailableDates(dates);
  }, []);

  // Fetch appointment details using reschedule token
  const {
    data: appointment,
    isLoading: isLoadingAppointment,
    error: appointmentError,
  } = useQuery({
    queryKey: ['reschedule-appointment', tenantSlug, rescheduleToken],
    queryFn: () => bookingApi.getAppointment(tenantSlug, '', rescheduleToken),
    enabled: !!tenantSlug && !!rescheduleToken,
  });

  // Fetch available time slots for selected date
  const {
    data: timeSlots,
    isLoading: isLoadingSlots,
    error: slotsError,
  } = useQuery({
    queryKey: [
      'reschedule-slots',
      tenantSlug,
      appointment?.serviceId,
      appointment?.staffId,
      selectedDate,
    ],
    queryFn: () => {
      if (!appointment) return Promise.resolve([]);

      return bookingApi.getAvailability(tenantSlug, {
        serviceId: appointment.serviceId._id,
        staffId: appointment.staffId?._id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        timezone: appointment.customerTimezone,
      });
    },
    enabled: !!appointment && !!tenantSlug,
  });

  // Reschedule mutation
  const rescheduleMutation = useMutation({
    mutationFn: async (newSlot: TimeSlot) => {
      // This would call a reschedule API endpoint
      // For now, we'll simulate the API call
      const response = await fetch(`/api/public/${tenantSlug}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: rescheduleToken,
          newStartTime: newSlot.startTime,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reschedule appointment');
      }

      return response.json();
    },
    onSuccess: (data) => {
      router.push(`/book/${tenantSlug}/confirmation/${data.appointment.id}`);
    },
    onError: (error) => {
      console.error('Reschedule failed:', error);
    },
  });

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleReschedule = async () => {
    if (!selectedSlot) return;

    setIsRescheduling(true);
    try {
      await rescheduleMutation.mutateAsync(selectedSlot);
    } catch (error) {
      setIsRescheduling(false);
    }
  };

  if (isLoadingAppointment) {
    return (
      <BookingLayout title="Loading Appointment...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </BookingLayout>
    );
  }

  if (appointmentError || !appointment) {
    return (
      <BookingLayout title="Invalid Reschedule Link">
        <div className="py-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <p className="mb-4 text-red-600">This reschedule link is invalid or has expired.</p>
          <button
            onClick={() => router.push(`/book/${tenantSlug}`)}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Make New Booking
          </button>
        </div>
      </BookingLayout>
    );
  }

  const currentDateTime = formatInTimeZone(
    new Date(appointment.startTime),
    appointment.customerTimezone,
    "EEEE, MMMM d, yyyy 'at' h:mm a"
  );

  return (
    <BookingLayout
      title="Reschedule Appointment"
      subtitle="Select a new date and time for your appointment"
    >
      <div className="space-y-6">
        {/* Current Appointment Details */}
        <div className="rounded-lg bg-gray-50 p-4">
          <h3 className="mb-3 font-medium text-gray-900">Current Appointment</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Service:</span>
              <span className="font-medium">{appointment.serviceId?.name}</span>
            </div>
            {appointment.staffId && (
              <div className="flex justify-between">
                <span className="text-gray-600">Staff:</span>
                <span className="font-medium">{appointment.staffId.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Current Time:</span>
              <span className="font-medium">{currentDateTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium">
                {formatDuration(appointment.serviceId?.durationMinutes || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Date Selection */}
        <div>
          <h3 className="mb-4 flex items-center text-lg font-medium text-gray-900">
            <Calendar className="mr-2 h-5 w-5" />
            Select New Date
          </h3>

          <div className="grid grid-cols-7 gap-2">
            {availableDates.slice(0, 14).map((date) => (
              <button
                key={date.toISOString()}
                onClick={() => handleDateSelect(date)}
                className={cn(
                  'rounded-lg border p-3 text-center transition-colors',
                  isSameDay(date, selectedDate)
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                <div className="mb-1 text-xs text-gray-500">{format(date, 'EEE')}</div>
                <div className="font-medium">{format(date, 'd')}</div>
                <div className="text-xs text-gray-500">{format(date, 'MMM')}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Time Slots */}
        <div>
          <h3 className="mb-4 flex items-center text-lg font-medium text-gray-900">
            <Clock className="mr-2 h-5 w-5" />
            Available Times for {format(selectedDate, 'EEEE, MMMM d')}
          </h3>

          {isLoadingSlots ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading available times...</span>
            </div>
          ) : slotsError ? (
            <div className="py-8 text-center">
              <p className="mb-4 text-red-600">Failed to load available times. Please try again.</p>
            </div>
          ) : !timeSlots || timeSlots.length === 0 ? (
            <div className="py-8 text-center">
              <p className="mb-2 text-gray-600">No available times for this date.</p>
              <p className="text-sm text-gray-500">Please select a different date.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {timeSlots
                .filter((slot) => slot.available)
                .map((slot) => {
                  const startTime = new Date(slot.startTime);
                  const displayTime = formatInTimeZone(
                    startTime,
                    appointment.customerTimezone,
                    'h:mm a'
                  );
                  const isSelected = selectedSlot?.startTime === slot.startTime;

                  return (
                    <button
                      key={slot.startTime}
                      onClick={() => handleSlotSelect(slot)}
                      className={cn(
                        'rounded-lg border p-3 text-center transition-colors',
                        isSelected
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      )}
                    >
                      {displayTime}
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* Reschedule Confirmation */}
        {selectedSlot && (
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-900">New Appointment Time</p>
                <p className="text-sm text-blue-700">
                  {formatInTimeZone(
                    new Date(selectedSlot.startTime),
                    appointment.customerTimezone,
                    "EEEE, MMMM d 'at' h:mm a"
                  )}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 border-t pt-4">
          {selectedSlot && (
            <button
              onClick={handleReschedule}
              disabled={isRescheduling || rescheduleMutation.isPending}
              className={cn(
                'w-full rounded-lg px-6 py-3 font-medium transition-colors',
                isRescheduling || rescheduleMutation.isPending
                  ? 'cursor-not-allowed bg-gray-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              )}
            >
              {isRescheduling || rescheduleMutation.isPending ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rescheduling...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm Reschedule
                </div>
              )}
            </button>
          )}

          <button
            onClick={() => router.push(`/book/${tenantSlug}`)}
            className="w-full rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel & Make New Booking
          </button>
        </div>

        {rescheduleMutation.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-600">
              Failed to reschedule appointment. Please try again or contact support.
            </p>
          </div>
        )}

        {/* Timezone Info */}
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-700">
            <strong>Timezone:</strong> {appointment.customerTimezone}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            All times are displayed in your original booking timezone
          </p>
        </div>
      </div>
    </BookingLayout>
  );
}
