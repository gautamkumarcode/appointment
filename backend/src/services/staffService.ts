import mongoose from 'mongoose';
import { IStaff, Staff } from '../models/Staff';
import { IStaffHoliday, StaffHoliday } from '../models/StaffHoliday';
import { logger } from '../utils/logger';

export interface CreateStaffDTO {
  name: string;
  email?: string;
  phone?: string;
  weeklySchedule: Record<string, { start: string; end: string }[]>;
}

export interface UpdateStaffDTO {
  name?: string;
  email?: string;
  phone?: string;
  weeklySchedule?: Record<string, { start: string; end: string }[]>;
}

export interface AddHolidayDTO {
  date: Date | string;
  reason?: string;
}

class StaffService {
  async createStaff(tenantId: string, data: CreateStaffDTO): Promise<IStaff> {
    try {
      // Validate input
      this.validateStaffData(data);

      const staff = new Staff({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        name: data.name,
        email: data.email,
        phone: data.phone,
        weeklySchedule: data.weeklySchedule,
      });

      await staff.save();
      logger.info(`Staff created: ${staff.id} for tenant: ${tenantId}`);
      return staff;
    } catch (error) {
      logger.error('Error creating staff:', error);
      throw error;
    }
  }

  async getStaffById(staffId: string, tenantId: string): Promise<IStaff | null> {
    try {
      const staff = await Staff.findOne({
        _id: staffId,
        tenantId: new mongoose.Types.ObjectId(tenantId),
        deletedAt: null,
      });

      return staff;
    } catch (error) {
      logger.error('Error fetching staff:', error);
      throw error;
    }
  }

  async listStaff(tenantId: string): Promise<IStaff[]> {
    try {
      const staff = await Staff.find({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        deletedAt: null,
      }).sort({ createdAt: -1 });

      return staff;
    } catch (error) {
      logger.error('Error listing staff:', error);
      throw error;
    }
  }

  async updateStaff(
    staffId: string,
    tenantId: string,
    data: UpdateStaffDTO
  ): Promise<IStaff | null> {
    try {
      // Validate update data
      if (data.name !== undefined && data.name.trim().length === 0) {
        throw new Error('Staff name cannot be empty');
      }

      if (data.weeklySchedule !== undefined) {
        this.validateWeeklySchedule(data.weeklySchedule);
      }

      const staff = await Staff.findOneAndUpdate(
        {
          _id: staffId,
          tenantId: new mongoose.Types.ObjectId(tenantId),
          deletedAt: null,
        },
        { $set: data },
        { new: true, runValidators: true }
      );

      if (staff) {
        logger.info(`Staff updated: ${staffId} for tenant: ${tenantId}`);
      }

      return staff;
    } catch (error) {
      logger.error('Error updating staff:', error);
      throw error;
    }
  }

  async deleteStaff(staffId: string, tenantId: string): Promise<IStaff | null> {
    try {
      // Soft delete - set deletedAt timestamp
      const staff = await Staff.findOneAndUpdate(
        {
          _id: staffId,
          tenantId: new mongoose.Types.ObjectId(tenantId),
          deletedAt: null,
        },
        { $set: { deletedAt: new Date() } },
        { new: true }
      );

      if (staff) {
        logger.info(`Staff soft deleted: ${staffId} for tenant: ${tenantId}`);
      }

      return staff;
    } catch (error) {
      logger.error('Error deleting staff:', error);
      throw error;
    }
  }

  async updateAvailability(
    staffId: string,
    tenantId: string,
    weeklySchedule: Record<string, { start: string; end: string }[]>
  ): Promise<IStaff | null> {
    try {
      this.validateWeeklySchedule(weeklySchedule);

      const staff = await Staff.findOneAndUpdate(
        {
          _id: staffId,
          tenantId: new mongoose.Types.ObjectId(tenantId),
          deletedAt: null,
        },
        { $set: { weeklySchedule } },
        { new: true }
      );

      if (staff) {
        logger.info(`Staff availability updated: ${staffId}`);
      }

      return staff;
    } catch (error) {
      logger.error('Error updating staff availability:', error);
      throw error;
    }
  }

  async addHoliday(staffId: string, tenantId: string, data: AddHolidayDTO): Promise<IStaffHoliday> {
    try {
      // Verify staff exists and belongs to tenant
      const staff = await this.getStaffById(staffId, tenantId);
      if (!staff) {
        throw new Error('Staff not found');
      }

      const holiday = new StaffHoliday({
        staffId: new mongoose.Types.ObjectId(staffId),
        date: new Date(data.date),
        reason: data.reason,
      });

      await holiday.save();
      logger.info(`Holiday added for staff: ${staffId}`);
      return holiday;
    } catch (error) {
      logger.error('Error adding holiday:', error);
      throw error;
    }
  }

  async getHolidays(staffId: string, tenantId: string): Promise<IStaffHoliday[]> {
    try {
      // Verify staff exists and belongs to tenant
      const staff = await this.getStaffById(staffId, tenantId);
      if (!staff) {
        throw new Error('Staff not found');
      }

      const holidays = await StaffHoliday.find({
        staffId: new mongoose.Types.ObjectId(staffId),
      }).sort({ date: 1 });

      return holidays;
    } catch (error) {
      logger.error('Error fetching holidays:', error);
      throw error;
    }
  }

  async deleteHoliday(holidayId: string, staffId: string, tenantId: string): Promise<void> {
    try {
      // Verify staff exists and belongs to tenant
      const staff = await this.getStaffById(staffId, tenantId);
      if (!staff) {
        throw new Error('Staff not found');
      }

      await StaffHoliday.findOneAndDelete({
        _id: holidayId,
        staffId: new mongoose.Types.ObjectId(staffId),
      });

      logger.info(`Holiday deleted: ${holidayId} for staff: ${staffId}`);
    } catch (error) {
      logger.error('Error deleting holiday:', error);
      throw error;
    }
  }

  private validateStaffData(data: CreateStaffDTO): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Staff name is required');
    }

    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    this.validateWeeklySchedule(data.weeklySchedule);
  }

  private validateWeeklySchedule(schedule: Record<string, { start: string; end: string }[]>): void {
    const validDays = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];

    for (const day in schedule) {
      if (!validDays.includes(day.toLowerCase())) {
        throw new Error(`Invalid day: ${day}`);
      }

      const slots = schedule[day];
      if (!Array.isArray(slots)) {
        throw new Error(`Schedule for ${day} must be an array`);
      }

      for (const slot of slots) {
        if (!slot.start || !slot.end) {
          throw new Error(`Each time slot must have start and end times`);
        }

        if (!this.isValidTimeFormat(slot.start) || !this.isValidTimeFormat(slot.end)) {
          throw new Error(`Invalid time format. Use HH:MM format (e.g., 09:00)`);
        }

        if (slot.start >= slot.end) {
          throw new Error(`Start time must be before end time for ${day}`);
        }
      }
    }
  }

  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export const staffService = new StaffService();
