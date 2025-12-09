import { Request, Response } from 'express';
import { serviceService } from '../services/serviceService';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';

class ServiceController {
  async createService(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        } as ApiResponse);
        return;
      }

      const service = await serviceService.createService(tenantId, req.body);

      res.status(201).json({
        success: true,
        data: service,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Error in createService controller:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create service',
      } as ApiResponse);
    }
  }

  async getService(req: Request, res: Response): Promise<void> {
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
      const service = await serviceService.getServiceById(id, tenantId);

      if (!service) {
        res.status(404).json({
          success: false,
          error: 'Service not found',
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: service,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Error in getService controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch service',
      } as ApiResponse);
    }
  }

  async listServices(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        } as ApiResponse);
        return;
      }

      const filters = {
        isActive:
          req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        includeDeleted: req.query.includeDeleted === 'true',
      };

      const services = await serviceService.listServices(tenantId, filters);

      res.json({
        success: true,
        data: services,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Error in listServices controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch services',
      } as ApiResponse);
    }
  }

  async updateService(req: Request, res: Response): Promise<void> {
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
      const service = await serviceService.updateService(id, tenantId, req.body);

      if (!service) {
        res.status(404).json({
          success: false,
          error: 'Service not found',
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: service,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Error in updateService controller:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update service',
      } as ApiResponse);
    }
  }

  async deleteService(req: Request, res: Response): Promise<void> {
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
      const service = await serviceService.deleteService(id, tenantId);

      if (!service) {
        res.status(404).json({
          success: false,
          error: 'Service not found',
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        message: 'Service deleted successfully',
        data: service,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Error in deleteService controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete service',
      } as ApiResponse);
    }
  }
}

export const serviceController = new ServiceController();
