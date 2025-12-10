'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { formatInTimeZone } from 'date-fns-tz';
import { ChevronLeft, CreditCard, Loader2, MapPin, MessageSquare, User } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { BookingLayout } from '../../../../components/BookingLayout';
import { bookingApi, CreateBookingData } from '../../../../lib/booking-api';
import { useBookingStore } from '../../../../lib/booking-store';
import { cn, formatCurrency, formatDuration } from '../../../../lib/utils';

// Form validation schema
const bookingFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  notes: z.string().optional(),
  paymentOption: z.enum(['prepaid', 'pay_at_venue'], {
    required_error: 'Please select a payment option',
  }),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;

  const {
    selectedService,
    selectedStaff,
    selectedSlot,
    customerTimezone,
    customerInfo,
    setCustomerInfo,
  } = useBookingStore();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch tenant info
  const { data: tenantInfo } = useQuery({
    queryKey: ['tenantInfo', tenantSlug],
    queryFn: () => bookingApi.getTenantInfo(tenantSlug),
    enabled: !!tenantSlug,
  });

  // Redirect if required data is missing
  useEffect(() => {
    if (!selectedService || !selectedSlot) {
      router.push(`/book/${tenantSlug}`);
    }
  }, [selectedService, selectedSlot, router, tenantSlug]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      name: customerInfo.name,
      email: customerInfo.email,
      phone: customerInfo.phone,
      notes: customerInfo.notes,
      paymentOption: customerInfo.paymentOption,
    },
  });

  // Note: We'll update the store when the form is submitted instead of watching all changes

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: (data: CreateBookingData) => bookingApi.createBooking(tenantSlug, data),
    onSuccess: (response) => {
      if (response.paymentUrl) {
        // Redirect to payment gateway for prepaid bookings
        window.location.href = response.paymentUrl;
      } else {
        // Redirect to confirmation page for pay-at-venue bookings
        router.push(
          `/book/${tenantSlug}/confirmation/${response._id}?token=${response.rescheduleToken}`
        );
      }
    },
    onError: (error: any) => {
      console.error('Booking failed:', error);
      setIsSubmitting(false);
    },
  });

  const onSubmit = useCallback(
    async (data: BookingFormData) => {
      if (!selectedService || !selectedSlot) return;

      setIsSubmitting(true);

      // Update store with form data
      setCustomerInfo(data);

      // Calculate end time based on service duration
      const startTime = new Date(selectedSlot.startTime);
      const endTime = new Date(startTime.getTime() + selectedService.durationMinutes * 60 * 1000);

      const bookingData: CreateBookingData = {
        serviceId: selectedService._id,
        staffId: selectedStaff?._id,
        startTime: selectedSlot.startTime,
        endTime: endTime.toISOString(),
        customerTimezone,
        customerName: data.name,
        customerEmail: data.email,
        customerPhone: data.phone || undefined,
        notes: data.notes || undefined,
        paymentOption: data.paymentOption,
      };

      // Use mutate instead of mutateAsync to let onSuccess/onError handlers work properly
      createBookingMutation.mutate(bookingData);
    },
    [
      selectedService,
      selectedSlot,
      selectedStaff,
      customerTimezone,
      setCustomerInfo,
      createBookingMutation,
    ]
  );

  const handleBack = () => {
    router.push(`/book/${tenantSlug}/slots`);
  };

  if (!selectedService || !selectedSlot) {
    return null; // Will redirect in useEffect
  }

  const appointmentDateTime = formatInTimeZone(
    new Date(selectedSlot.startTime),
    customerTimezone,
    "EEEE, MMMM d 'at' h:mm a"
  );

  return (
    <BookingLayout
      title="Booking Details"
      subtitle="Please provide your information to complete the booking"
      step={3}
      totalSteps={4}
      tenantBranding={tenantInfo}
    >
      <div className="space-y-6">
        <button
          onClick={handleBack}
          className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to time selection
        </button>

        {/* Booking Summary */}
        <div className="rounded-lg bg-gray-50 p-4">
          <h3 className="mb-3 font-medium text-gray-900">Booking Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Service:</span>
              <span className="font-medium">{selectedService.name}</span>
            </div>
            {selectedStaff && (
              <div className="flex justify-between">
                <span className="text-gray-600">Staff:</span>
                <span className="font-medium">{selectedStaff.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Date & Time:</span>
              <span className="font-medium">{appointmentDateTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium">{formatDuration(selectedService.durationMinutes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Price:</span>
              <span className="font-medium">
                {formatCurrency(selectedService.price, selectedService.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Booking Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="mb-4 flex items-center text-lg font-medium text-gray-900">
              <User className="mr-2 h-5 w-5" />
              Personal Information
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
                  Full Name *
                </label>
                <input
                  {...register('name')}
                  type="text"
                  id="name"
                  className={cn(
                    'w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  )}
                  placeholder="Enter your full name"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
              </div>

              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                  Email Address *
                </label>
                <input
                  {...register('email')}
                  type="email"
                  id="email"
                  className={cn(
                    'w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  )}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
                Phone Number (Optional)
              </label>
              <input
                {...register('phone')}
                type="tel"
                id="phone"
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your phone number"
              />
              <p className="mt-1 text-xs text-gray-500">
                We'll use this to send you appointment reminders via SMS/WhatsApp
              </p>
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <h3 className="mb-4 flex items-center text-lg font-medium text-gray-900">
              <MessageSquare className="mr-2 h-5 w-5" />
              Additional Information
            </h3>

            <div>
              <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-700">
                Notes (Optional)
              </label>
              <textarea
                {...register('notes')}
                id="notes"
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any special requests or information we should know?"
              />
            </div>
          </div>

          {/* Payment Options */}
          <div>
            <h3 className="mb-4 flex items-center text-lg font-medium text-gray-900">
              <CreditCard className="mr-2 h-5 w-5" />
              Payment Option
            </h3>

            <div className="space-y-3">
              <label className="flex cursor-pointer items-center rounded-lg border p-4 hover:bg-gray-50">
                <input
                  {...register('paymentOption')}
                  type="radio"
                  value="pay_at_venue"
                  className="h-4 w-4 border-gray-300 focus:ring-2"
                  style={
                    {
                      accentColor: tenantInfo?.primaryColor || '#2563eb',
                      '--tw-ring-color': `${tenantInfo?.primaryColor || '#2563eb'}50`,
                    } as any
                  }
                />
                <div className="ml-3">
                  <div className="flex items-center">
                    <MapPin className="mr-2 h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-900">Pay at venue</span>
                  </div>
                  <p className="text-sm text-gray-500">Pay when you arrive for your appointment</p>
                </div>
              </label>

              <label className="flex cursor-pointer items-center rounded-lg border p-4 hover:bg-gray-50">
                <input
                  {...register('paymentOption')}
                  type="radio"
                  value="prepaid"
                  className="h-4 w-4 border-gray-300 focus:ring-2"
                  style={
                    {
                      accentColor: tenantInfo?.primaryColor || '#2563eb',
                      '--tw-ring-color': `${tenantInfo?.primaryColor || '#2563eb'}50`,
                    } as any
                  }
                />
                <div className="ml-3">
                  <div className="flex items-center">
                    <CreditCard className="mr-2 h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-900">Pay now</span>
                  </div>
                  <p className="text-sm text-gray-500">Secure your booking with online payment</p>
                </div>
              </label>
            </div>

            {errors.paymentOption && (
              <p className="mt-2 text-sm text-red-600">{errors.paymentOption.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="border-t pt-4">
            <button
              type="submit"
              disabled={isSubmitting || createBookingMutation.isPending}
              className={cn(
                'w-full rounded-lg px-6 py-3 font-medium text-white transition-colors',
                isSubmitting || createBookingMutation.isPending
                  ? 'cursor-not-allowed bg-gray-400'
                  : 'hover:opacity-90'
              )}
              style={
                isSubmitting || createBookingMutation.isPending
                  ? {}
                  : { backgroundColor: tenantInfo?.primaryColor || '#2563eb' }
              }
            >
              {isSubmitting || createBookingMutation.isPending ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </div>
              ) : (
                `Complete Booking - ${formatCurrency(selectedService.price, selectedService.currency)}`
              )}
            </button>
          </div>

          {createBookingMutation.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-600">
                Failed to create booking. Please try again or contact support.
              </p>
            </div>
          )}
        </form>
      </div>
    </BookingLayout>
  );
}
