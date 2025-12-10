import { PopulatedAppointment, Service } from '../types';
import { apiClient } from './api';

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface CreateBookingData {
  serviceId: string;
  staffId?: string;
  startTime: string;
  endTime: string;
  customerTimezone: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
  paymentOption: 'prepaid' | 'pay_at_venue';
}

export interface BookingResponse {
  _id: string;
  serviceId: string;
  customerId: string;
  staffId?: string;
  startTime: string;
  endTime: string;
  customerTimezone: string;
  status: string;
  notes?: string;
  paymentOption: string;
  paymentStatus: string;
  amount?: number;
  rescheduleToken: string; // Required for accessing appointment details
  // Additional fields from backend transformation
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  serviceName?: string;
  staffName?: string;
  paymentUrl?: string; // For prepaid bookings
}

export interface TenantInfo {
  businessName: string;
  logo?: string;
  primaryColor?: string;
  timezone: string;
  currency: string;
}

// Public booking API (no auth required)
export const bookingApi = {
  // Get tenant branding information
  getTenantInfo: async (tenantSlug: string): Promise<TenantInfo> => {
    const response = await apiClient.get(`/public/${tenantSlug}/info`);
    return response.data.data;
  },

  // Get services for a tenant
  getServices: async (tenantSlug: string): Promise<Service[]> => {
    const response = await apiClient.get(`/public/${tenantSlug}/services`);
    return response.data.data;
  },

  // Get available time slots
  getAvailability: async (
    tenantSlug: string,
    params: {
      serviceId: string;
      staffId?: string;
      date?: string;
      timezone: string;
    }
  ): Promise<TimeSlot[]> => {
    const response = await apiClient.get(`/public/${tenantSlug}/availability`, {
      params,
    });
    return response.data.data;
  },

  // Create a booking
  createBooking: async (tenantSlug: string, data: CreateBookingData): Promise<BookingResponse> => {
    const response = await apiClient.post(`/public/${tenantSlug}/book`, data);
    return response.data.data;
  },

  // Get appointment details
  getAppointment: async (
    tenantSlug: string,
    appointmentId: string,
    token?: string
  ): Promise<PopulatedAppointment> => {
    const params = token ? { token } : {};
    const response = await apiClient.get(`/public/${tenantSlug}/appointment/${appointmentId}`, {
      params,
    });
    return response.data.data;
  },
};
