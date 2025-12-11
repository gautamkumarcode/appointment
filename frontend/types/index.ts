// Common types and interfaces

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type AppointmentStatus = 'confirmed' | 'completed' | 'cancelled' | 'no-show';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type PaymentOption = 'prepaid' | 'pay_at_venue';

export interface Service {
  _id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  currency: string;
  bufferMinutes: number;
  requireStaff: boolean;
  isActive: boolean;
}

export interface Staff {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  weeklySchedule: Record<string, { start: string; end: string }[]>;
}

export interface StaffHoliday {
  _id: string;
  staffId: string;
  date: string;
  reason?: string;
}

export interface Appointment {
  _id: string;
  serviceId: string;
  customerId: string;
  staffId?: string;
  startTime: string;
  endTime: string;
  customerTimezone: string;
  status: AppointmentStatus;
  notes?: string;
  paymentOption: PaymentOption;
  paymentStatus: PaymentStatus;
  amount?: number;
  rescheduleToken?: string;
  service?: Service;
  staff?: Staff;
  customer?: Customer;
}

// Extended appointment type for API responses with populated fields
export interface PopulatedAppointment {
  _id: string;
  serviceId: {
    _id: string;
    name: string;
    description?: string;
    durationMinutes: number;
    price: number;
    currency: string;
  };
  customerId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  staffId?: {
    _id: string;
    name: string;
    email?: string;
  };
  startTime: string;
  endTime: string;
  customerTimezone: string;
  status: AppointmentStatus;
  notes?: string;
  paymentOption: PaymentOption;
  paymentStatus: PaymentStatus;
  amount?: number;
  rescheduleToken: string;
  // Additional fields from backend transformation
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  serviceName?: string;
  staffName?: string;
}

export interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  timezone?: string;
  appointmentCount?: number;
}

export interface Tenant {
  _id: string;
  id?: string; // Keep for backward compatibility
  slug: string;
  businessName: string;
  email: string;
  phone?: string;
  timezone: string;
  currency: string;
  logo?: string;
  primaryColor?: string;
  settings: Record<string, any>;
  // Widget configuration
  chatWelcomeMessage?: string;
  bookingUrl?: string;
  showWidgetBranding?: boolean;
}
