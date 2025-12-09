import mongoose from 'mongoose';
import { Appointment } from '../models/Appointment';
import { Customer, ICustomer } from '../models/Customer';
import { logger } from '../utils/logger';

export interface CreateCustomerDTO {
  name: string;
  email: string;
  phone?: string;
  timezone?: string;
}

export interface CustomerSearchFilters {
  search?: string; // Search by name, email, or phone
  page?: number;
  limit?: number;
}

export interface CustomerWithStats extends ICustomer {
  appointmentCount: number;
}

class CustomerService {
  /**
   * Find or create a customer for a tenant
   * This is used during booking to automatically create customers
   */
  async findOrCreateCustomer(tenantId: string, data: CreateCustomerDTO): Promise<ICustomer> {
    try {
      // Try to find existing customer by email
      let customer = await Customer.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        email: data.email.toLowerCase(),
      });

      if (customer) {
        // Update customer info if provided
        if (data.name) customer.name = data.name;
        if (data.phone) customer.phone = data.phone;
        if (data.timezone) customer.timezone = data.timezone;
        await customer.save();
        logger.info(`Customer updated: ${customer.id} for tenant: ${tenantId}`);
      } else {
        // Create new customer
        customer = new Customer({
          tenantId: new mongoose.Types.ObjectId(tenantId),
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone,
          timezone: data.timezone,
        });
        await customer.save();
        logger.info(`Customer created: ${customer.id} for tenant: ${tenantId}`);
      }

      return customer;
    } catch (error) {
      logger.error('Error in findOrCreateCustomer:', error);
      throw error;
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(customerId: string, tenantId: string): Promise<ICustomer | null> {
    try {
      const customer = await Customer.findOne({
        _id: customerId,
        tenantId: new mongoose.Types.ObjectId(tenantId),
      });

      return customer;
    } catch (error) {
      logger.error('Error fetching customer:', error);
      throw error;
    }
  }

  /**
   * List all customers for a tenant with search and filtering
   */
  async listCustomers(
    tenantId: string,
    filters: CustomerSearchFilters = {}
  ): Promise<{ customers: ICustomer[]; total: number }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const skip = (page - 1) * limit;

      const query: any = {
        tenantId: new mongoose.Types.ObjectId(tenantId),
      };

      // Apply search filter
      if (filters.search) {
        const searchRegex = new RegExp(filters.search, 'i');
        query.$or = [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }];
      }

      const [customers, total] = await Promise.all([
        Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Customer.countDocuments(query),
      ]);

      return { customers, total };
    } catch (error) {
      logger.error('Error listing customers:', error);
      throw error;
    }
  }

  /**
   * Get customer profile with appointment history
   */
  async getCustomerProfile(
    customerId: string,
    tenantId: string
  ): Promise<{
    customer: ICustomer;
    appointments: any[];
    appointmentCount: number;
  } | null> {
    try {
      const customer = await this.getCustomerById(customerId, tenantId);
      if (!customer) {
        return null;
      }

      // Get all appointments for this customer
      const appointments = await Appointment.find({
        customerId: new mongoose.Types.ObjectId(customerId),
        tenantId: new mongoose.Types.ObjectId(tenantId),
      })
        .populate('serviceId', 'name durationMinutes price')
        .populate('staffId', 'name')
        .sort({ startTime: -1 });

      const appointmentCount = appointments.length;

      return {
        customer,
        appointments,
        appointmentCount,
      };
    } catch (error) {
      logger.error('Error fetching customer profile:', error);
      throw error;
    }
  }

  /**
   * Get appointment count for a customer
   */
  async getCustomerAppointmentCount(customerId: string, tenantId: string): Promise<number> {
    try {
      const count = await Appointment.countDocuments({
        customerId: new mongoose.Types.ObjectId(customerId),
        tenantId: new mongoose.Types.ObjectId(tenantId),
      });

      return count;
    } catch (error) {
      logger.error('Error counting customer appointments:', error);
      throw error;
    }
  }

  /**
   * Get customer appointment history
   */
  async getCustomerAppointmentHistory(customerId: string, tenantId: string): Promise<any[]> {
    try {
      // Verify customer exists and belongs to tenant
      const customer = await this.getCustomerById(customerId, tenantId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const appointments = await Appointment.find({
        customerId: new mongoose.Types.ObjectId(customerId),
        tenantId: new mongoose.Types.ObjectId(tenantId),
      })
        .populate('serviceId', 'name durationMinutes price')
        .populate('staffId', 'name')
        .sort({ startTime: -1 });

      return appointments;
    } catch (error) {
      logger.error('Error fetching appointment history:', error);
      throw error;
    }
  }

  /**
   * Search customers by name, email, or phone
   */
  async searchCustomers(tenantId: string, searchTerm: string): Promise<ICustomer[]> {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return [];
      }

      const searchRegex = new RegExp(searchTerm.trim(), 'i');

      const customers = await Customer.find({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        $or: [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }],
      })
        .sort({ name: 1 })
        .limit(20);

      return customers;
    } catch (error) {
      logger.error('Error searching customers:', error);
      throw error;
    }
  }

  /**
   * Get customers with appointment counts
   */
  async getCustomersWithStats(
    tenantId: string,
    filters: CustomerSearchFilters = {}
  ): Promise<{ customers: CustomerWithStats[]; total: number }> {
    try {
      const { customers, total } = await this.listCustomers(tenantId, filters);

      // Get appointment counts for all customers
      const customerIds = customers.map((c) => c._id);
      const appointmentCounts = await Appointment.aggregate([
        {
          $match: {
            customerId: { $in: customerIds },
            tenantId: new mongoose.Types.ObjectId(tenantId),
          },
        },
        {
          $group: {
            _id: '$customerId',
            count: { $sum: 1 },
          },
        },
      ]);

      // Create a map of customer ID to appointment count
      const countMap = new Map(appointmentCounts.map((item) => [item._id.toString(), item.count]));

      // Add appointment counts to customers
      const customersWithStats: CustomerWithStats[] = customers.map((customer) => ({
        ...customer.toObject(),
        appointmentCount: countMap.get(customer._id.toString()) || 0,
      }));

      return { customers: customersWithStats, total };
    } catch (error) {
      logger.error('Error getting customers with stats:', error);
      throw error;
    }
  }
}

export const customerService = new CustomerService();
