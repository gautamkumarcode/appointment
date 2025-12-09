// Common types and interfaces

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type AppointmentStatus = 'confirmed' | 'completed' | 'cancelled' | 'no-show';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type PaymentOption = 'prepaid' | 'pay_at_venue';
export type PaymentProvider = 'stripe' | 'razorpay';
export type MessageChannel = 'web' | 'whatsapp' | 'messenger' | 'instagram';
export type UserRole = 'owner' | 'admin' | 'staff';
