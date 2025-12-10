import { ApiResponse, Appointment, Customer } from '../types';
import { apiClient } from './api';

export interface CustomerSearchParams {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CustomerListResponse {
  customers: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const customerApi = {
  getCustomers: async (params?: CustomerSearchParams): Promise<Customer[]> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, value.toString());
      });
    }

    const response = await apiClient.get<ApiResponse<CustomerListResponse>>(
      `/customers?${searchParams}`
    );
    return response.data.data!.customers;
  },

  getCustomer: async (id: string): Promise<Customer> => {
    const response = await apiClient.get<ApiResponse<Customer>>(`/customers/${id}`);
    return response.data.data!;
  },

  getCustomerHistory: async (id: string): Promise<Appointment[]> => {
    const response = await apiClient.get<ApiResponse<Appointment[]>>(`/customers/${id}/history`);
    return response.data.data!;
  },

  searchCustomers: async (query: string): Promise<Customer[]> => {
    const response = await apiClient.get<ApiResponse<Customer[]>>(
      `/customers/search?q=${encodeURIComponent(query)}`
    );
    return response.data.data!;
  },
};
