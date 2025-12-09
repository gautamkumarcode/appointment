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
  id: string;
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
  id: string;
  name: string;
  email?: string;
  phone?: string;
  weeklySchedule: Record<string, { start: string; end: string }[]>;
}

export interface Appointment {
  id: string;
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
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  timezone?: string;
}
