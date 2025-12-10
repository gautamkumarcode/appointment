'use client';

import { useQuery } from '@tanstack/react-query';
import { formatInTimeZone } from 'date-fns-tz';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Edit,
  Loader2,
  Mail,
  MapPin,
  User,
} from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { BookingLayout } from '../../../../../components/BookingLayout';
import { bookingApi } from '../../../../../lib/booking-api';
import { useBookingStore } from '../../../../../lib/booking-store';
import { formatCurrency, formatDuration } from '../../../../../lib/utils';
import type { PopulatedAppointment } from '../../../../../types';

export default function BookingConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const appointmentId = params.appointmentId as string;
  const token = searchParams.get('token');

  const { customerTimezone, resetBooking } = useBookingStore();

  // Fetch tenant info
  const { data: tenantInfo } = useQuery({
    queryKey: ['tenantInfo', tenantSlug],
    queryFn: () => bookingApi.getTenantInfo(tenantSlug),
    enabled: !!tenantSlug,
  });

  // Fetch appointment details
  const {
    data: appointment,
    isLoading,
    error,
  } = useQuery<PopulatedAppointment>({
    queryKey: ['appointment', tenantSlug, appointmentId, token],
    queryFn: () => bookingApi.getAppointment(tenantSlug, appointmentId, token || undefined),
    enabled: !!tenantSlug && !!appointmentId && !!token,
  });

  // Reset booking state when component mounts
  useEffect(() => {
    resetBooking();
  }, [resetBooking]);

  const handleNewBooking = () => {
    router.push(`/book/${tenantSlug}`);
  };

  const handleReschedule = () => {
    if (appointment?.rescheduleToken) {
      router.push(`/book/${tenantSlug}/reschedule/${appointment.rescheduleToken}`);
    }
  };

  // Show error if no token is provided
  if (!token) {
    return (
      <BookingLayout title="Access Required" step={4} totalSteps={4} tenantBranding={tenantInfo}>
        <div className="py-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Access Token Required</h3>
          <p className="mt-2 text-gray-600">
            This booking confirmation requires a valid access token.
          </p>
          <button
            onClick={() => router.push(`/book/${tenantSlug}`)}
            className="mt-4 rounded-lg px-6 py-3 text-white hover:opacity-90"
            style={{ backgroundColor: tenantInfo?.primaryColor || '#2563eb' }}
          >
            Make a New Booking
          </button>
        </div>
      </BookingLayout>
    );
  }

  if (isLoading) {
    return (
      <BookingLayout
        title="Loading Confirmation..."
        step={4}
        totalSteps={4}
        tenantBranding={tenantInfo}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </BookingLayout>
    );
  }

  if (error || !appointment) {
    return (
      <BookingLayout title="Booking Not Found" step={4} totalSteps={4} tenantBranding={tenantInfo}>
        <div className="py-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <p className="mb-4 text-red-600">Unable to find your booking confirmation.</p>
          <button
            onClick={handleNewBooking}
            className="rounded-md px-4 py-2 text-white hover:opacity-90"
            style={{ backgroundColor: tenantInfo?.primaryColor || '#2563eb' }}
          >
            Make New Booking
          </button>
        </div>
      </BookingLayout>
    );
  }

  const appointmentDateTime = formatInTimeZone(
    new Date(appointment.startTime),
    appointment.customerTimezone || customerTimezone,
    "EEEE, MMMM d, yyyy 'at' h:mm a"
  );

  const appointmentEndTime = formatInTimeZone(
    new Date(appointment.endTime),
    appointment.customerTimezone || customerTimezone,
    'h:mm a'
  );

  return (
    <BookingLayout
      title="Booking Confirmed!"
      subtitle="Your appointment has been successfully booked"
      step={4}
      totalSteps={4}
      tenantBranding={tenantInfo}
    >
      <div className="space-y-6">
        {/* Success Message */}
        <div className="py-6 text-center">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Booking Confirmed!</h2>
          <p className="text-gray-600">We've sent a confirmation email with all the details.</p>
        </div>

        {/* Appointment Details */}
        <div className="rounded-lg bg-gray-50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Appointment Details</h3>

          <div className="space-y-4">
            {/* Service Information */}
            <div className="flex items-start space-x-3">
              <Calendar className="mt-0.5 h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900">
                  {appointment.serviceName || appointment.serviceId?.name || 'Service'}
                </p>
                <p className="text-sm text-gray-600">{appointment.serviceId?.description}</p>
              </div>
            </div>

            {/* Date and Time */}
            <div className="flex items-start space-x-3">
              <Clock className="mt-0.5 h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900">{appointmentDateTime}</p>
                <p className="text-sm text-gray-600">
                  Duration: {formatDuration(appointment.serviceId?.durationMinutes || 0)}
                  (until {appointmentEndTime})
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Timezone: {appointment.customerTimezone || customerTimezone}
                </p>
              </div>
            </div>

            {/* Staff Member */}
            {(appointment.staffName || appointment.staffId) && (
              <div className="flex items-start space-x-3">
                <User className="mt-0.5 h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900">
                    {appointment.staffName || appointment.staffId?.name}
                  </p>
                  <p className="text-sm text-gray-600">Your service provider</p>
                </div>
              </div>
            )}

            {/* Customer Information */}
            <div className="flex items-start space-x-3">
              <Mail className="mt-0.5 h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900">
                  {appointment.customerName || appointment.customerId?.name}
                </p>
                <p className="text-sm text-gray-600">
                  {appointment.customerEmail || appointment.customerId?.email}
                </p>
                {(appointment.customerPhone || appointment.customerId?.phone) && (
                  <p className="text-sm text-gray-600">
                    {appointment.customerPhone || appointment.customerId?.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Payment Information */}
            <div className="flex items-start space-x-3">
              <CreditCard className="mt-0.5 h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900">
                  {appointment.paymentOption === 'prepaid' ? 'Paid Online' : 'Pay at Venue'}
                </p>
                <p className="text-sm text-gray-600">
                  Amount:{' '}
                  {formatCurrency(
                    appointment.amount || appointment.serviceId?.price || 0,
                    appointment.serviceId?.currency || 'USD'
                  )}
                </p>
                {appointment.paymentStatus && (
                  <p className="text-sm capitalize text-gray-600">
                    Status: {appointment.paymentStatus}
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            {appointment.notes && (
              <div className="flex items-start space-x-3">
                <MapPin className="mt-0.5 h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900">Notes</p>
                  <p className="text-sm text-gray-600">{appointment.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Important Information */}
        <div className="rounded-lg bg-blue-50 p-4">
          <h4 className="mb-2 font-medium text-blue-900">Important Information</h4>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• You'll receive a reminder 24 hours before your appointment</li>
            <li>• Please arrive 5-10 minutes early</li>
            <li>
              • If you need to cancel or reschedule, please do so at least 24 hours in advance
            </li>
            {appointment.paymentOption === 'pay_at_venue' && (
              <li>• Payment will be collected at the venue</li>
            )}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {appointment.rescheduleToken && (
            <button
              onClick={handleReschedule}
              className="flex w-full items-center justify-center rounded-lg border px-6 py-3 font-medium hover:bg-opacity-10"
              style={{
                borderColor: tenantInfo?.primaryColor || '#2563eb',
                color: tenantInfo?.primaryColor || '#2563eb',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${tenantInfo?.primaryColor || '#2563eb'}1a`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Reschedule Appointment
            </button>
          )}

          <button
            onClick={handleNewBooking}
            className="w-full rounded-lg px-6 py-3 font-medium text-white hover:opacity-90"
            style={{ backgroundColor: tenantInfo?.primaryColor || '#2563eb' }}
          >
            Book Another Appointment
          </button>
        </div>

        {/* Booking Reference */}
        <div className="border-t pt-4 text-center">
          <p className="text-xs text-gray-500">Booking Reference: {appointment._id}</p>
        </div>
      </div>
    </BookingLayout>
  );
}
