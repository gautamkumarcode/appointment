import { ApiResponse, Tenant } from '../types';
import { apiClient } from './api';

export interface UpdateTenantRequest {
  businessName?: string;
  email?: string;
  phone?: string;
  timezone?: string;
  currency?: string;
  logo?: string;
  primaryColor?: string;
  settings?: Record<string, any>;
}

export const tenantApi = {
  getTenant: async (): Promise<Tenant> => {
    const response = await apiClient.get<ApiResponse<Tenant>>('/tenants/me');
    return response.data.data!;
  },

  updateTenant: async (data: UpdateTenantRequest): Promise<Tenant> => {
    const response = await apiClient.put<ApiResponse<Tenant>>('/tenants/me', data);
    return response.data.data!;
  },

  uploadLogo: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('logo', file);

    const response = await apiClient.post<ApiResponse<{ url: string }>>(
      '/tenants/me/logo',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data!;
  },
};
