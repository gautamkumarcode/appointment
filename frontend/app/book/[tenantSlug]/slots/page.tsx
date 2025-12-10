'use client';

import { useQuery } from '@tanstack/react-query';
import { addDays, format, isSameDay, startOfDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Calendar, ChevronLeft, Clock, Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BookingLayout } from '../../../../components/BookingLayout';
import { bookingApi, TimeSlot } from '../../../../lib/booking-api';
import { useBookingStore } from '../../../../lib/booking-store';
import { cn } from '../../../../lib/utils';

export default function TimeSlotsPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;

  const { selectedService, selectedStaff, selectedSlot, customerTimezone, setSelectedSlot } =
    useBookingStore();

  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [availableDates, setAvailableDates] = useState<Date[]>([]);

  // Redirect if no service selected
  useEffect(() => {
    if (!selectedService) {
      router.push(`/book/${tenantSlug}`);
    }
  }, [selectedService, router, tenantSlug]);

  // Fetch tenant info
  const { data: tenantInfo } = useQuery({
    queryKey: ['tenantInfo', tenantSlug],
    queryFn: () => bookingApi.getTenantInfo(tenantSlug),
    enabled: !!tenantSlug,
  });

  // Generate available dates (next 30 days)
  useEffect(() => {
    const dates = [];
    const today = startOfDay(new Date());
    for (let i = 0; i < 30; i++) {
      dates.push(addDays(today, i));
    }
    setAvailableDates(dates);
  }, []);

  // Fetch time slots for selected date
  const {
    data: timeSlots,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'timeSlots',
      tenantSlug,
      selectedService?._id,
      selectedStaff?._id,
      selectedDate,
      customerTimezone,
    ],
    queryFn: () => {
      const serviceId = selectedService?._id;
      const staffId = selectedStaff?._id;

      if (!selectedService) {
        return Promise.resolve([]);
      }

      return bookingApi.getAvailability(tenantSlug, {
        serviceId: serviceId!,
        staffId: staffId,
        date: format(selectedDate, 'yyyy-MM-dd'),
        timezone: customerTimezone,
      });
    },
    enabled: !!selectedService && !!selectedService?._id && !!tenantSlug,
  });

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null); // Reset selected slot when date changes
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot({
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  };

  const handleContinue = () => {
    if (selectedSlot) {
      router.push(`/book/${tenantSlug}/details`);
    }
  };

  const handleBack = () => {
    router.push(`/book/${tenantSlug}`);
  };

  if (!selectedService) {
    return (
      <BookingLayout
        title="No Service Selected"
        subtitle="Please select a service first"
        step={2}
        totalSteps={4}
        tenantBranding={tenantInfo}
      >
        <div className="py-12 text-center">
          <p className="mb-4 text-gray-600">
            You need to select a service before choosing a time slot.
          </p>
          <button
            onClick={() => router.push(`/book/${tenantSlug}`)}
            className="rounded-lg px-6 py-3 text-white hover:opacity-90"
            style={{ backgroundColor: tenantInfo?.primaryColor || '#2563eb' }}
          >
            Select a Service
          </button>
        </div>
      </BookingLayout>
    );
  }

  return (
    <BookingLayout
      title="Select Date & Time"
      subtitle={`For ${selectedService.name}${selectedStaff ? ` with ${selectedStaff.name}` : ''}`}
      step={2}
      totalSteps={4}
      tenantBranding={tenantInfo}
    >
      <div className="space-y-6">
        <button
          onClick={handleBack}
          className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to services
        </button>

        {/* Date Selection */}
        <div>
          <h3 className="mb-4 flex items-center text-lg font-medium text-gray-900">
            <Calendar className="mr-2 h-5 w-5" />
            Select Date
          </h3>

          <div className="grid grid-cols-7 gap-2">
            {availableDates.slice(0, 14).map((date) => (
              <button
                key={date.toISOString()}
                onClick={() => handleDateSelect(date)}
                className={cn(
                  'rounded-lg border p-3 text-center transition-colors',
                  isSameDay(date, selectedDate)
                    ? ''
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                )}
                style={
                  isSameDay(date, selectedDate)
                    ? {
                        borderColor: tenantInfo?.primaryColor || '#2563eb',
                        backgroundColor: `${tenantInfo?.primaryColor || '#2563eb'}1a`,
                        color: tenantInfo?.primaryColor || '#2563eb',
                      }
                    : {}
                }
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

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading available times...</span>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="mb-4 text-red-600">Failed to load available times. Please try again.</p>
              <button
                onClick={() => refetch()}
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : !timeSlots || timeSlots.length === 0 ? (
            <div className="py-8 text-center">
              <p className="mb-2 text-gray-600">No available times for this date.</p>
              <p className="text-sm text-gray-500">
                Please select a different date or try again later.
              </p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {timeSlots
                  .filter((slot) => slot.available)
                  .map((slot) => {
                    const startTime = new Date(slot.startTime);
                    const displayTime = formatInTimeZone(startTime, customerTimezone, 'h:mm a');
                    const isSelected = selectedSlot?.startTime === slot.startTime;

                    return (
                      <button
                        key={slot.startTime}
                        onClick={() => handleSlotSelect(slot)}
                        className={cn(
                          'rounded-lg border p-3 text-center transition-colors',
                          isSelected
                            ? 'text-white'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        )}
                        style={
                          isSelected
                            ? {
                                borderColor: tenantInfo?.primaryColor || '#2563eb',
                                backgroundColor: tenantInfo?.primaryColor || '#2563eb',
                              }
                            : {}
                        }
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = `${tenantInfo?.primaryColor || '#2563eb'}80`;
                            e.currentTarget.style.backgroundColor = `${tenantInfo?.primaryColor || '#2563eb'}1a`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = '#d1d5db';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {displayTime}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Timezone Info */}
        <div
          className="rounded-lg p-4"
          style={{
            backgroundColor: `${tenantInfo?.primaryColor || '#2563eb'}1a`,
          }}
        >
          <p
            className="text-sm font-medium"
            style={{ color: tenantInfo?.primaryColor || '#2563eb' }}
          >
            <strong>Timezone:</strong> {customerTimezone}
          </p>
          <p
            className="mt-1 text-xs"
            style={{ color: `${tenantInfo?.primaryColor || '#2563eb'}cc` }}
          >
            All times are displayed in your local timezone
          </p>
        </div>

        {/* Continue Button */}
        {selectedSlot && (
          <div className="border-t pt-4">
            <button
              onClick={handleContinue}
              className="w-full rounded-lg px-6 py-3 font-medium text-white hover:opacity-90"
              style={{ backgroundColor: tenantInfo?.primaryColor || '#2563eb' }}
            >
              Continue with{' '}
              {formatInTimeZone(
                new Date(selectedSlot.startTime),
                customerTimezone,
                "EEEE, MMMM d 'at' h:mm a"
              )}
            </button>
          </div>
        )}
      </div>
    </BookingLayout>
  );
}
