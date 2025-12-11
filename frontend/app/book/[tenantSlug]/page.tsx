'use client';

import { useQuery } from '@tanstack/react-query';
import { Clock, DollarSign, Loader2, Users } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BookingLayout } from '../../../components/BookingLayout';
import { bookingApi } from '../../../lib/booking-api';
import { useBookingStore } from '../../../lib/booking-store';
import { cn, formatCurrency, formatDuration } from '../../../lib/utils';
import { Service, Staff } from '../../../types';

export default function ServiceSelectionPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;

  const { setTenantSlug, setSelectedService, setSelectedStaff, selectedService, selectedStaff } =
    useBookingStore();

  const [availableStaff, setAvailableStaff] = useState<Staff[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  // Set tenant slug when component mounts
  useEffect(() => {
    if (tenantSlug) {
      setTenantSlug(tenantSlug);
    }
  }, [tenantSlug, setTenantSlug]);

  // Fetch tenant info
  const { data: tenantInfo, isLoading: tenantLoading } = useQuery({
    queryKey: ['tenantInfo', tenantSlug],
    queryFn: () => bookingApi.getTenantInfo(tenantSlug),
    enabled: !!tenantSlug,
  });

  // Fetch services
  const {
    data: services,
    isLoading: servicesLoading,
    error,
  } = useQuery({
    queryKey: ['services', tenantSlug],
    queryFn: () => bookingApi.getServices(tenantSlug),
    enabled: !!tenantSlug,
  });

  const isLoading = tenantLoading || servicesLoading;

  const handleServiceSelect = async (service: Service) => {
    setSelectedService(service);

    // If service requires staff selection, fetch staff from API
    if (service.requireStaff) {
      setStaffLoading(true);
      setStaffError(null);
      try {
        const staff = await bookingApi.getStaff(tenantSlug);
        setAvailableStaff(staff);
      } catch (error) {
        console.error('Failed to fetch staff:', error);
        setStaffError('Failed to load staff members. Please try again.');
        setAvailableStaff([]);
      } finally {
        setStaffLoading(false);
      }
    } else {
      // If no staff selection required, proceed to time slot selection
      router.push(`/book/${tenantSlug}/slots`);
    }
  };

  const handleStaffSelect = (staff: Staff) => {
    setSelectedStaff(staff);
    router.push(`/book/${tenantSlug}/slots`);
  };

  const handleContinueWithoutStaff = () => {
    setSelectedStaff(null);
    router.push(`/book/${tenantSlug}/slots`);
  };

  if (isLoading) {
    return (
      <BookingLayout
        title="Loading Services..."
        step={1}
        totalSteps={4}
        tenantBranding={tenantInfo}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2
            className="h-8 w-8 animate-spin"
            style={{ color: tenantInfo?.primaryColor || '#2563eb' }}
          />
        </div>
      </BookingLayout>
    );
  }

  if (error) {
    return (
      <BookingLayout
        title="Error Loading Services"
        step={1}
        totalSteps={4}
        tenantBranding={tenantInfo}
      >
        <div className="py-12 text-center">
          <p className="mb-4 text-red-600">Failed to load services. Please try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md px-4 py-2 text-white hover:opacity-90"
            style={{
              backgroundColor: tenantInfo?.primaryColor || '#2563eb',
            }}
          >
            Retry
          </button>
        </div>
      </BookingLayout>
    );
  }

  if (!services || services.length === 0) {
    return (
      <BookingLayout
        title="No Services Available"
        step={1}
        totalSteps={4}
        tenantBranding={tenantInfo}
      >
        <div className="py-12 text-center">
          <p className="mb-4 text-gray-600">No services are currently available for booking.</p>
          <p className="text-sm text-gray-500">
            Please check back later or contact the business directly.
          </p>
        </div>
      </BookingLayout>
    );
  }

  // Show staff selection if service is selected and requires staff
  if (selectedService && selectedService.requireStaff) {
    return (
      <BookingLayout
        title="Select Staff Member"
        subtitle={`For ${selectedService.name}`}
        step={1}
        totalSteps={4}
        tenantBranding={tenantInfo}
      >
        <div className="space-y-4">
          <button
            onClick={() => {
              setSelectedService(null);
              setAvailableStaff([]);
              setStaffError(null);
            }}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Back to services
          </button>

          {staffLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2
                className="h-6 w-6 animate-spin"
                style={{ color: tenantInfo?.primaryColor || '#2563eb' }}
              />
              <span className="ml-2 text-gray-600">Loading staff members...</span>
            </div>
          )}

          {staffError && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-600">{staffError}</p>
              <button
                onClick={() => handleServiceSelect(selectedService)}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-800"
              >
                Try again
              </button>
            </div>
          )}

          {!staffLoading && !staffError && availableStaff.length === 0 && (
            <div className="py-8 text-center">
              <p className="mb-2 text-gray-600">
                No staff members are currently available for this service.
              </p>
              <p className="text-sm text-gray-500">
                You can still continue with your booking and we'll assign an available staff member.
              </p>
            </div>
          )}

          {!staffLoading && !staffError && availableStaff.length > 0 && (
            <div className="grid gap-4">
              {availableStaff.map((staff) => (
                <button
                  key={staff._id}
                  onClick={() => handleStaffSelect(staff)}
                  className={cn(
                    'rounded-lg border p-4 text-left transition-colors',
                    selectedStaff?._id === staff._id ? '' : 'border-gray-200 hover:border-gray-300'
                  )}
                  style={{
                    ...(selectedStaff?._id === staff._id && {
                      borderColor: tenantInfo?.primaryColor || '#2563eb',
                      backgroundColor: `${tenantInfo?.primaryColor || '#2563eb'}1a`, // 10% opacity
                    }),
                  }}
                  onMouseEnter={(e) => {
                    if (selectedStaff?._id !== staff._id) {
                      e.currentTarget.style.borderColor = `${tenantInfo?.primaryColor || '#2563eb'}80`;
                      e.currentTarget.style.backgroundColor = `${tenantInfo?.primaryColor || '#2563eb'}0d`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedStaff?._id !== staff._id) {
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300">
                        <Users className="h-5 w-5 text-gray-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{staff.name}</h3>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!staffLoading && (
            <div className="border-t pt-4">
              <button
                onClick={handleContinueWithoutStaff}
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50"
              >
                No preference (any available staff)
              </button>
            </div>
          )}
        </div>
      </BookingLayout>
    );
  }

  // Show service selection
  return (
    <BookingLayout
      title="Select a Service"
      subtitle="Choose the service you'd like to book"
      step={1}
      totalSteps={4}
      tenantBranding={tenantInfo}
    >
      <div className="grid gap-4">
        {services.map((service) => (
          <button
            key={service._id}
            onClick={() => handleServiceSelect(service)}
            className={cn(
              'rounded-lg border p-6 text-left transition-colors',
              'hover:border-opacity-50 hover:bg-opacity-10',
              selectedService?._id === service._id
                ? 'bg-opacity-10'
                : 'border-gray-200 hover:border-gray-300'
            )}
            style={
              selectedService?._id === service._id
                ? {
                    borderColor: tenantInfo?.primaryColor || '#2563eb',
                    backgroundColor: `${tenantInfo?.primaryColor || '#2563eb'}1a`, // 10% opacity
                  }
                : {}
            }
            onMouseEnter={(e) => {
              if (selectedService?._id !== service._id) {
                e.currentTarget.style.borderColor = `${tenantInfo?.primaryColor || '#2563eb'}80`;
                e.currentTarget.style.backgroundColor = `${tenantInfo?.primaryColor || '#2563eb'}0d`;
              }
            }}
            onMouseLeave={(e) => {
              if (selectedService?._id !== service._id) {
                e.currentTarget.style.borderColor = '#d1d5db'; // gray-300
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">{service.name}</h3>

                {service.description && <p className="mb-3 text-gray-600">{service.description}</p>}

                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(service.durationMinutes)}</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <DollarSign className="h-4 w-4" />
                    <span>{formatCurrency(service.price, service.currency)}</span>
                  </div>

                  {service.requireStaff && (
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>Staff selection required</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </BookingLayout>
  );
}
