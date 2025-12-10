import { ApiResponse } from '../types';
import { apiClient } from './api';

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
}

export interface BookingStats {
  totalBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
}

export interface RevenueStats {
  totalRevenue: number;
  paidRevenue: number;
  unpaidRevenue: number;
  refundedRevenue: number;
}

export interface CustomerStats {
  totalCustomers: number;
  newCustomers: number;
  repeatCustomers: number;
  repeatCustomerRate: number;
}

export interface AnalyticsData {
  bookings: BookingStats;
  revenue: RevenueStats;
  customers: CustomerStats;
  noShows: {
    count: number;
    rate: number;
  };
}

export const analyticsApi = {
  getBookingStats: async (filters?: AnalyticsFilters): Promise<BookingStats> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    const response = await apiClient.get<ApiResponse<BookingStats>>(
      `/analytics/bookings?${params}`
    );
    return response.data.data!;
  },

  getRevenueStats: async (filters?: AnalyticsFilters): Promise<RevenueStats> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    const response = await apiClient.get<ApiResponse<RevenueStats>>(`/analytics/revenue?${params}`);
    return response.data.data!;
  },

  getCustomerStats: async (filters?: AnalyticsFilters): Promise<CustomerStats> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    const response = await apiClient.get<ApiResponse<CustomerStats>>(
      `/analytics/customers?${params}`
    );
    return response.data.data!;
  },

  getNoShowStats: async (filters?: AnalyticsFilters): Promise<{ count: number; rate: number }> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    const response = await apiClient.get<ApiResponse<{ count: number; rate: number }>>(
      `/analytics/no-shows?${params}`
    );
    return response.data.data!;
  },

  getAllAnalytics: async (filters?: AnalyticsFilters): Promise<AnalyticsData> => {
    const [bookings, revenue, customers, noShows] = await Promise.all([
      analyticsApi.getBookingStats(filters),
      analyticsApi.getRevenueStats(filters),
      analyticsApi.getCustomerStats(filters),
      analyticsApi.getNoShowStats(filters),
    ]);

    return {
      bookings,
      revenue,
      customers,
      noShows,
    };
  },
};
