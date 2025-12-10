import { ApiResponse, Staff, StaffHoliday } from '../types';
import { apiClient } from './api';

export interface CreateStaffRequest {
  name: string;
  email?: string;
  phone?: string;
  weeklySchedule: Record<string, { start: string; end: string }[]>;
}

export interface UpdateStaffRequest extends Partial<CreateStaffRequest> {}

export interface CreateHolidayRequest {
  date: string;
  reason?: string;
}

export const staffApi = {
  getStaff: async (): Promise<Staff[]> => {
    const response = await apiClient.get<ApiResponse<Staff[]>>('/staff');
    return response.data.data!;
  },

  getStaffMember: async (id: string): Promise<Staff> => {
    const response = await apiClient.get<ApiResponse<Staff>>(`/staff/${id}`);
    return response.data.data!;
  },

  createStaff: async (data: CreateStaffRequest): Promise<Staff> => {
    const response = await apiClient.post<ApiResponse<Staff>>('/staff', data);
    return response.data.data!;
  },

  updateStaff: async (id: string, data: UpdateStaffRequest): Promise<Staff> => {
    const response = await apiClient.put<ApiResponse<Staff>>(`/staff/${id}`, data);
    return response.data.data!;
  },

  deleteStaff: async (id: string): Promise<void> => {
    await apiClient.delete(`/staff/${id}`);
  },

  updateAvailability: async (
    id: string,
    weeklySchedule: Record<string, { start: string; end: string }[]>
  ): Promise<Staff> => {
    const response = await apiClient.put<ApiResponse<Staff>>(`/staff/${id}/availability`, {
      weeklySchedule,
    });
    return response.data.data!;
  },

  addHoliday: async (id: string, data: CreateHolidayRequest): Promise<StaffHoliday> => {
    const response = await apiClient.post<ApiResponse<StaffHoliday>>(`/staff/${id}/holidays`, data);
    return response.data.data!;
  },

  getHolidays: async (id: string): Promise<StaffHoliday[]> => {
    const response = await apiClient.get<ApiResponse<StaffHoliday[]>>(`/staff/${id}/holidays`);
    return response.data.data!;
  },

  deleteHoliday: async (staffId: string, holidayId: string): Promise<void> => {
    await apiClient.delete(`/staff/${staffId}/holidays/${holidayId}`);
  },
};
