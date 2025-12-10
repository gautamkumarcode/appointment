import { ApiResponse, Appointment, AppointmentStatus } from '../types';
import { apiClient } from './api';

export interface AppointmentFilters {
  startDate?: string;
  endDate?: string;
  status?: AppointmentStatus;
  customerId?: string;
  staffId?: string;
}

export interface UpdateAppointmentRequest {
  serviceId?: string;
  staffId?: string;
  startTime?: string;
  endTime?: string;
  status?: AppointmentStatus;
  notes?: string;
}

export interface RescheduleRequest {
  newStartTime: string;
  newEndTime: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export const appointmentApi = {
  getAppointments: async (filters?: AppointmentFilters): Promise<Appointment[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    const response = await apiClient.get<ApiResponse<Appointment[]>>(`/appointments?${params}`);
    return response.data.data!;
  },

  getAvailableSlots: async (params: {
    serviceId: string;
    staffId?: string;
    date?: string;
    timezone: string;
  }): Promise<TimeSlot[]> => {
    const response = await apiClient.get<ApiResponse<TimeSlot[]>>('/availability/slots', {
      params,
    });
    return response.data.data!;
  },

  getAppointment: async (id: string): Promise<Appointment> => {
    const response = await apiClient.get<ApiResponse<Appointment>>(`/appointments/${id}`);
    return response.data.data!;
  },

  updateAppointment: async (id: string, data: UpdateAppointmentRequest): Promise<Appointment> => {
    const response = await apiClient.put<ApiResponse<Appointment>>(`/appointments/${id}`, data);
    return response.data.data!;
  },

  updateStatus: async (id: string, status: AppointmentStatus): Promise<Appointment> => {
    const response = await apiClient.put<ApiResponse<Appointment>>(`/appointments/${id}/status`, {
      status,
    });
    return response.data.data!;
  },

  rescheduleAppointment: async (id: string, data: RescheduleRequest): Promise<Appointment> => {
    const response = await apiClient.post<ApiResponse<Appointment>>(
      `/appointments/${id}/reschedule`,
      data
    );
    return response.data.data!;
  },

  cancelAppointment: async (id: string): Promise<void> => {
    await apiClient.delete(`/appointments/${id}`);
  },
};
