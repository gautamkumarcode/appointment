import { Request, Response } from 'express';
import { staffService } from '../services/staffService';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';

class StaffController {
  async createStaff(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        } as ApiResponse);
        return;
      }

      const staff = await staffService.createStaff(tenantId, req.body);

      res.status(201).json({
        success: true,
        data: staff,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Error in createStaff controller:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create staff',
      } as ApiResponse);
    }
  }

  async getStaff(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        } as ApiResponse);
        return;
      }

      const { id } = req.params;
      const staff = await staffService.getStaffById(id, tenantId);

      if (!staff) {
        res.status(404).json({
          success: false,
          error: 'Staff not found',
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: staff,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Error in getStaff controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch staff',
      } as ApiResponse);
    }
  }

  async listStaff(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        } as ApiResponse);
        return;
      }

      const staff = await staffService.listStaff(tenantId);

      res.json({
        success: true,
        data: staff,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Error in listStaff controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch staff',
      } as ApiResponse);
    }
  }

  async updateStaff(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        } as ApiResponse);
        return;
      }

      const { id } = req.params;
      const staff = await staffService.updateStaff(id, tenantId, req.body);

      if (!staff) {
        res.status(404).json({
          success: false,
          error: 'Staff not found',
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: staff,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Error in updateStaff controller:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update staff',
      } as ApiResponse);
    }
  }

  async deleteStaff(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        } as ApiResponse);
        return;
      }

      const { id } = req.params;
      const staff = await staffService.deleteStaff(id, tenantId);

      if (!staff) {
        res.status(404).json({
          success: false,
          error: 'Staff not found',
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        message: 'Staff deleted successfully',
        data: staff,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Error in deleteStaff controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete staff',
      } as ApiResponse);
    }
  }

  async updateAvailability(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        } as ApiResponse);
        return;
      }

      const { id } = req.params;
      const { weeklySchedule } = req.body;

      if (!weeklySchedule) {
        res.status(400).json({
          success: false,
          error: 'Weekly schedule is required',
        } as ApiResponse);
        return;
      }

      const staff = await staffService.updateAvailability(id, tenantId, weeklySchedule);

      if (!staff) {
        res.status(404).json({
          success: false,
          error: 'Staff not found',
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: staff,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Error in updateAvailability controller:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update availability',
      } as ApiResponse);
    }
  }

  async addHoliday(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        } as ApiResponse);
        return;
      }

      const { id } = req.params;
      const holiday = await staffService.addHoliday(id, tenantId, req.body);

      res.status(201).json({
        success: true,
        data: holiday,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Error in addHoliday controller:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to add holiday',
      } as ApiResponse);
    }
  }

  async getHolidays(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        } as ApiResponse);
        return;
      }

      const { id } = req.params;
      const holidays = await staffService.getHolidays(id, tenantId);

      res.json({
        success: true,
        data: holidays,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Error in getHolidays controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch holidays',
      } as ApiResponse);
    }
  }

  async deleteHoliday(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        } as ApiResponse);
        return;
      }

      const { id, holidayId } = req.params;
      await staffService.deleteHoliday(holidayId, id, tenantId);

      res.json({
        success: true,
        message: 'Holiday deleted successfully',
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Error in deleteHoliday controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete holiday',
      } as ApiResponse);
    }
  }
}

export const staffController = new StaffController();
