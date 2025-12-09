import { Request, Response } from 'express';
import { customerService } from '../services/customerService';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';

class CustomerController {
  async getCustomer(req: Request, res: Response): Promise<void> {
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
      const customer = await customerService.getCustomerById(id, tenantId);

      if (!customer) {
        res.status(404).json({
          success: false,
          error: 'Customer not found',
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: customer,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Error in getCustomer controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch customer',
      } as ApiResponse);
    }
  }

  async listCustomers(req: Request, res: Response): Promise<void> {
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
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      };

      const { customers, total } = await customerService.getCustomersWithStats(tenantId, filters);

      res.json({
        success: true,
        data: {
          customers,
          pagination: {
            page: filters.page,
            limit: filters.limit,
            total,
            totalPages: Math.ceil(total / filters.limit),
          },
        },
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Error in listCustomers controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch customers',
      } as ApiResponse);
    }
  }

  async getCustomerProfile(req: Request, res: Response): Promise<void> {
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
      const profile = await customerService.getCustomerProfile(id, tenantId);

      if (!profile) {
        res.status(404).json({
          success: false,
          error: 'Customer not found',
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: profile,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Error in getCustomerProfile controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch customer profile',
      } as ApiResponse);
    }
  }

  async getCustomerHistory(req: Request, res: Response): Promise<void> {
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
      const appointments = await customerService.getCustomerAppointmentHistory(id, tenantId);

      res.json({
        success: true,
        data: appointments,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Error in getCustomerHistory controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch customer history',
      } as ApiResponse);
    }
  }

  async searchCustomers(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        } as ApiResponse);
        return;
      }

      const searchTerm = req.query.q as string;
      if (!searchTerm) {
        res.status(400).json({
          success: false,
          error: 'Search term is required',
        } as ApiResponse);
        return;
      }

      const customers = await customerService.searchCustomers(tenantId, searchTerm);

      res.json({
        success: true,
        data: customers,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Error in searchCustomers controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search customers',
      } as ApiResponse);
    }
  }
}

export const customerController = new CustomerController();
