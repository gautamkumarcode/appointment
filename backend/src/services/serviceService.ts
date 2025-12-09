import mongoose from 'mongoose';
import { IService, Service } from '../models/Service';
import { logger } from '../utils/logger';

export interface CreateServiceDTO {
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  currency: string;
  bufferMinutes?: number;
  requireStaff?: boolean;
}

export interface UpdateServiceDTO {
  name?: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
  currency?: string;
  bufferMinutes?: number;
  requireStaff?: boolean;
  isActive?: boolean;
}

export interface ServiceFilters {
  isActive?: boolean;
  includeDeleted?: boolean;
}

class ServiceService {
  async createService(tenantId: string, data: CreateServiceDTO): Promise<IService> {
    try {
      // Validate input
      this.validateServiceData(data);

      const service = new Service({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        name: data.name,
        description: data.description,
        durationMinutes: data.durationMinutes,
        price: data.price,
        currency: data.currency.toUpperCase(),
        bufferMinutes: data.bufferMinutes || 0,
        requireStaff: data.requireStaff || false,
        isActive: true,
      });

      await service.save();
      logger.info(`Service created: ${service.id} for tenant: ${tenantId}`);
      return service;
    } catch (error) {
      logger.error('Error creating service:', error);
      throw error;
    }
  }

  async getServiceById(serviceId: string, tenantId: string): Promise<IService | null> {
    try {
      const service = await Service.findOne({
        _id: serviceId,
        tenantId: new mongoose.Types.ObjectId(tenantId),
        deletedAt: null,
      });

      return service;
    } catch (error) {
      logger.error('Error fetching service:', error);
      throw error;
    }
  }

  async listServices(tenantId: string, filters: ServiceFilters = {}): Promise<IService[]> {
    try {
      const query: any = {
        tenantId: new mongoose.Types.ObjectId(tenantId),
      };

      // Apply filters
      if (!filters.includeDeleted) {
        query.deletedAt = null;
      }

      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      const services = await Service.find(query).sort({ createdAt: -1 });
      return services;
    } catch (error) {
      logger.error('Error listing services:', error);
      throw error;
    }
  }

  async updateService(
    serviceId: string,
    tenantId: string,
    data: UpdateServiceDTO
  ): Promise<IService | null> {
    try {
      // Validate update data
      if (data.durationMinutes !== undefined && data.durationMinutes < 1) {
        throw new Error('Duration must be at least 1 minute');
      }

      if (data.price !== undefined && data.price < 0) {
        throw new Error('Price cannot be negative');
      }

      if (data.bufferMinutes !== undefined && data.bufferMinutes < 0) {
        throw new Error('Buffer time cannot be negative');
      }

      const updateData: any = { ...data };
      if (data.currency) {
        updateData.currency = data.currency.toUpperCase();
      }

      const service = await Service.findOneAndUpdate(
        {
          _id: serviceId,
          tenantId: new mongoose.Types.ObjectId(tenantId),
          deletedAt: null,
        },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (service) {
        logger.info(`Service updated: ${serviceId} for tenant: ${tenantId}`);
      }

      return service;
    } catch (error) {
      logger.error('Error updating service:', error);
      throw error;
    }
  }

  async deleteService(serviceId: string, tenantId: string): Promise<IService | null> {
    try {
      // Soft delete - set deletedAt timestamp
      const service = await Service.findOneAndUpdate(
        {
          _id: serviceId,
          tenantId: new mongoose.Types.ObjectId(tenantId),
          deletedAt: null,
        },
        { $set: { deletedAt: new Date(), isActive: false } },
        { new: true }
      );

      if (service) {
        logger.info(`Service soft deleted: ${serviceId} for tenant: ${tenantId}`);
      }

      return service;
    } catch (error) {
      logger.error('Error deleting service:', error);
      throw error;
    }
  }

  private validateServiceData(data: CreateServiceDTO): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Service name is required');
    }

    if (data.durationMinutes < 1) {
      throw new Error('Duration must be at least 1 minute');
    }

    if (data.price < 0) {
      throw new Error('Price cannot be negative');
    }

    if (!data.currency || data.currency.trim().length === 0) {
      throw new Error('Currency is required');
    }

    if (data.bufferMinutes !== undefined && data.bufferMinutes < 0) {
      throw new Error('Buffer time cannot be negative');
    }
  }
}

export const serviceService = new ServiceService();
