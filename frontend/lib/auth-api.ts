import { ApiResponse } from '../types';
import { apiClient } from './api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  ownerPassword: string;
  ownerName: string;
  businessName: string;
  phone?: string;
  timezone?: string;
  currency?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    tenantId: string;
  };
}

export interface TenantRegistrationResponse {
  tenant: {
    id: string;
    slug: string;
    businessName: string;
    email: string;
    phone?: string;
    timezone: string;
    currency: string;
    bookingUrl: string;
  };
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    console.log('🔐 Attempting login for:', data.email);
    console.log('📤 Login request data:', data);
    const response = await apiClient.post<ApiResponse<{ user: any }>>('/auth/login', data);
    console.log('📥 Login response:', response.data);
    const { user } = response.data.data!;

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
      },
    };
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<TenantRegistrationResponse>>(
      '/tenants/register',
      data
    );
    const { tenant, user } = response.data.data!;

    // Transform to match AuthResponse format
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: tenant.id, // The tenant ID from the created tenant
      },
    };
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getMe: async (): Promise<AuthResponse['user']> => {
    const response = await apiClient.get<ApiResponse<{ user: AuthResponse['user'] }>>('/auth/me');
    return response.data.data!.user;
  },
};
