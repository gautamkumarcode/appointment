import { ApiResponse, Service } from '../types';
import { apiClient } from './api';

export interface CreateServiceRequest {
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  currency: string;
  bufferMinutes: number;
  requireStaff: boolean;
}

export interface UpdateServiceRequest extends Partial<CreateServiceRequest> {}

export const serviceApi = {
  getServices: async (): Promise<Service[]> => {
    const response = await apiClient.get<ApiResponse<Service[]>>('/services');
    return response.data.data!;
  },

  getService: async (id: string): Promise<Service> => {
    const response = await apiClient.get<ApiResponse<Service>>(`/services/${id}`);
    return response.data.data!;
  },

  createService: async (data: CreateServiceRequest): Promise<Service> => {
    const response = await apiClient.post<ApiResponse<Service>>('/services', data);
    return response.data.data!;
  },

  updateService: async (id: string, data: UpdateServiceRequest): Promise<Service> => {
    const response = await apiClient.put<ApiResponse<Service>>(`/services/${id}`, data);
    return response.data.data!;
  },

  deleteService: async (id: string): Promise<void> => {
    await apiClient.delete(`/services/${id}`);
  },
};
