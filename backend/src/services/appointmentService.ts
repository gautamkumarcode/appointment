import { randomBytes } from 'crypto';
import mongoose from 'mongoose';
import { Appointment, IAppointment } from '../models/Appointment';
import { Service } from '../models/Service';
import { Staff } from '../models/Staff';
import { logger } from '../utils/logger';
import { checkAndLockSlot } from './availabilityService';
import { customerService } from './customerService';
import followUpScheduler from './followUpScheduler';
import reminderScheduler from './reminderScheduler';

export interface CreateAppointmentDTO {
  serviceId: string;
  startTime: Date; // UTC
  endTime: Date; // UTC
  customerTimezone: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  staffId?: string;
  notes?: string;
  paymentOption: 'prepaid' | 'pay_at_venue';
  amount?: number;
}

export interface UpdateAppointmentDTO {
  status?: 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  paymentStatus?: 'unpaid' | 'paid' | 'refunded';
  paymentId?: string;
}

export interface AppointmentFilters {
  startDate?: Date;
  endDate?: Date;
  status?: string | string[];
  customerId?: string;
  staffId?: string;
  page?: number;
  limit?: number;
}

export interface RescheduleAppointmentDTO {
  newStartTime: Date; // UTC
  newEndTime: Date; // UTC
}

class AppointmentService {
  /**
   * Create a new appointment with validation and slot verification
   */
  async createAppointment(tenantId: string, data: CreateAppointmentDTO): Promise<IAppointment> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate service exists and is active
      const service = await Service.findOne({
        _id: data.serviceId,
        tenantId: new mongoose.Types.ObjectId(tenantId),
        isActive: true,
        deletedAt: null,
      }).session(session);

      if (!service) {
        throw new Error('Service not found or inactive');
      }

      // Validate staff if provided or required
      if (data.staffId || service.requireStaff) {
        const staffId = data.staffId || null;
        if (!staffId && service.requireStaff) {
          throw new Error('Staff member is required for this service');
        }

        if (staffId) {
          const staff = await Staff.findOne({
            _id: staffId,
            tenantId: new mongoose.Types.ObjectId(tenantId),
            deletedAt: null,
          }).session(session);

          if (!staff) {
            throw new Error('Staff member not found');
          }
        }
      }

      // Verify slot is still available with database-level locking
      const isAvailable = await checkAndLockSlot(
        tenantId,
        data.serviceId,
        data.startTime,
        data.endTime,
        data.staffId,
        session
      );

      if (!isAvailable) {
        throw new Error('Selected time slot is no longer available');
      }

      // Find or create customer
      const customer = await customerService.findOrCreateCustomer(tenantId, {
        name: data.customerName,
        email: data.customerEmail,
        phone: data.customerPhone,
        timezone: data.customerTimezone,
      });

      // Generate reschedule token
      const rescheduleToken = this.generateRescheduleToken();

      // Determine payment status based on payment option
      const paymentStatus = data.paymentOption === 'prepaid' ? 'unpaid' : 'unpaid';

      // Create appointment
      const appointment = new Appointment({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        serviceId: new mongoose.Types.ObjectId(data.serviceId),
        customerId: customer._id,
        staffId: data.staffId ? new mongoose.Types.ObjectId(data.staffId) : undefined,
        startTime: data.startTime,
        endTime: data.endTime,
        customerTimezone: data.customerTimezone,
        status: 'confirmed',
        notes: data.notes,
        paymentOption: data.paymentOption,
        paymentStatus,
        amount: data.amount || service.price,
        rescheduleToken,
      });

      await appointment.save({ session });

      await session.commitTransaction();
      logger.info(`Appointment created: ${appointment.id} for tenant: ${tenantId}`);

      // Populate references before returning
      await appointment.populate([
        { path: 'serviceId', select: 'name durationMinutes price' },
        { path: 'customerId', select: 'name email phone' },
        { path: 'staffId', select: 'name email' },
      ]);

      // Schedule reminder for 24 hours before appointment
      try {
        await reminderScheduler.scheduleReminder(appointment._id.toString(), appointment.startTime);
      } catch (error) {
        // Log error but don't fail appointment creation
        logger.error('Failed to schedule reminder', {
          appointmentId: appointment._id,
          error: (error as Error).message,
        });
      }

      return appointment;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error creating appointment:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get appointment by ID
   */
  async getAppointmentById(appointmentId: string, tenantId: string): Promise<IAppointment | null> {
    try {
      const appointment = await Appointment.findOne({
        _id: appointmentId,
        tenantId: new mongoose.Types.ObjectId(tenantId),
      })
        .populate('serviceId', 'name durationMinutes price')
        .populate('customerId', 'name email phone')
        .populate('staffId', 'name email');

      return appointment;
    } catch (error) {
      logger.error('Error fetching appointment:', error);
      throw error;
    }
  }

  /**
   * Get appointment by reschedule token (for public access)
   */
  async getAppointmentByToken(rescheduleToken: string): Promise<IAppointment | null> {
    try {
      const appointment = await Appointment.findOne({
        rescheduleToken,
      })
        .populate('serviceId', 'name durationMinutes price')
        .populate('customerId', 'name email phone')
        .populate('staffId', 'name email');

      return appointment;
    } catch (error) {
      logger.error('Error fetching appointment by token:', error);
      throw error;
    }
  }

  /**
   * Update appointment details
   */
  async updateAppointment(
    appointmentId: string,
    tenantId: string,
    data: UpdateAppointmentDTO
  ): Promise<IAppointment | null> {
    try {
      const appointment = await Appointment.findOne({
        _id: appointmentId,
        tenantId: new mongoose.Types.ObjectId(tenantId),
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Update fields
      if (data.status) appointment.status = data.status;
      if (data.notes !== undefined) appointment.notes = data.notes;
      if (data.paymentStatus) appointment.paymentStatus = data.paymentStatus;
      if (data.paymentId) appointment.paymentId = data.paymentId;

      await appointment.save();
      logger.info(`Appointment updated: ${appointmentId}`);

      // Populate references
      await appointment.populate([
        { path: 'serviceId', select: 'name durationMinutes price' },
        { path: 'customerId', select: 'name email phone' },
        { path: 'staffId', select: 'name email' },
      ]);

      return appointment;
    } catch (error) {
      logger.error('Error updating appointment:', error);
      throw error;
    }
  }

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(
    appointmentId: string,
    tenantId: string,
    status: 'confirmed' | 'completed' | 'cancelled' | 'no-show'
  ): Promise<IAppointment | null> {
    try {
      const appointment = await this.updateAppointment(appointmentId, tenantId, { status });

      // Schedule follow-up jobs based on status
      if (status === 'completed') {
        // Schedule follow-up message for completed appointments
        try {
          await followUpScheduler.scheduleFollowUp(appointmentId);
        } catch (error) {
          logger.error('Failed to schedule follow-up', {
            appointmentId,
            error: (error as Error).message,
          });
        }
      } else if (status === 'no-show') {
        // Schedule no-show rebooking reminder
        try {
          await followUpScheduler.scheduleNoShowReminder(appointmentId);
        } catch (error) {
          logger.error('Failed to schedule no-show reminder', {
            appointmentId,
            error: (error as Error).message,
          });
        }
      } else if (status === 'cancelled') {
        // Cancel any scheduled reminders or follow-ups
        try {
          await reminderScheduler.cancelReminder(appointmentId);
          await followUpScheduler.cancelFollowUp(appointmentId);
        } catch (error) {
          logger.error('Failed to cancel scheduled jobs', {
            appointmentId,
            error: (error as Error).message,
          });
        }
      }

      return appointment;
    } catch (error) {
      logger.error('Error updating appointment status:', error);
      throw error;
    }
  }

  /**
   * Cancel appointment
   */
  async cancelAppointment(
    appointmentId: string,
    tenantId: string,
    reason?: string
  ): Promise<IAppointment | null> {
    try {
      const appointment = await this.updateAppointment(appointmentId, tenantId, {
        status: 'cancelled',
        notes: reason,
      });

      // Cancel scheduled reminder
      try {
        await reminderScheduler.cancelReminder(appointmentId);
      } catch (error) {
        logger.error('Failed to cancel reminder', {
          appointmentId,
          error: (error as Error).message,
        });
      }

      logger.info(`Appointment cancelled: ${appointmentId}`);
      return appointment;
    } catch (error) {
      logger.error('Error cancelling appointment:', error);
      throw error;
    }
  }

  /**
   * Reschedule appointment to a new time slot
   */
  async rescheduleAppointment(
    appointmentId: string,
    tenantId: string,
    data: RescheduleAppointmentDTO
  ): Promise<IAppointment | null> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get existing appointment
      const appointment = await Appointment.findOne({
        _id: appointmentId,
        tenantId: new mongoose.Types.ObjectId(tenantId),
      }).session(session);

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Cannot reschedule cancelled or completed appointments
      if (appointment.status === 'cancelled' || appointment.status === 'completed') {
        throw new Error(`Cannot reschedule ${appointment.status} appointment`);
      }

      // Verify new slot is available
      const isAvailable = await checkAndLockSlot(
        tenantId,
        appointment.serviceId.toString(),
        data.newStartTime,
        data.newEndTime,
        appointment.staffId?.toString(),
        session
      );

      if (!isAvailable) {
        throw new Error('New time slot is not available');
      }

      // Update appointment with new time
      appointment.startTime = data.newStartTime;
      appointment.endTime = data.newEndTime;
      await appointment.save({ session });

      await session.commitTransaction();
      logger.info(`Appointment rescheduled: ${appointmentId}`);

      // Populate references
      await appointment.populate([
        { path: 'serviceId', select: 'name durationMinutes price' },
        { path: 'customerId', select: 'name email phone' },
        { path: 'staffId', select: 'name email' },
      ]);

      // Reschedule reminder for new time
      try {
        await reminderScheduler.rescheduleReminder(appointmentId, data.newStartTime);
      } catch (error) {
        logger.error('Failed to reschedule reminder', {
          appointmentId,
          error: (error as Error).message,
        });
      }

      return appointment;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error rescheduling appointment:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Reschedule appointment using reschedule token (for public access)
   */
  async rescheduleAppointmentByToken(
    rescheduleToken: string,
    data: RescheduleAppointmentDTO
  ): Promise<IAppointment | null> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get appointment by token
      const appointment = await Appointment.findOne({
        rescheduleToken,
      }).session(session);

      if (!appointment) {
        throw new Error('Invalid reschedule token');
      }

      // Cannot reschedule cancelled or completed appointments
      if (appointment.status === 'cancelled' || appointment.status === 'completed') {
        throw new Error(`Cannot reschedule ${appointment.status} appointment`);
      }

      // Verify new slot is available
      const isAvailable = await checkAndLockSlot(
        appointment.tenantId.toString(),
        appointment.serviceId.toString(),
        data.newStartTime,
        data.newEndTime,
        appointment.staffId?.toString(),
        session
      );

      if (!isAvailable) {
        throw new Error('New time slot is not available');
      }

      // Update appointment with new time
      appointment.startTime = data.newStartTime;
      appointment.endTime = data.newEndTime;
      await appointment.save({ session });

      await session.commitTransaction();
      logger.info(`Appointment rescheduled via token: ${appointment.id}`);

      // Populate references
      await appointment.populate([
        { path: 'serviceId', select: 'name durationMinutes price' },
        { path: 'customerId', select: 'name email phone' },
        { path: 'staffId', select: 'name email' },
      ]);

      // Reschedule reminder for new time
      try {
        await reminderScheduler.rescheduleReminder(appointment._id.toString(), data.newStartTime);
      } catch (error) {
        logger.error('Failed to reschedule reminder', {
          appointmentId: appointment._id,
          error: (error as Error).message,
        });
      }

      return appointment;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error rescheduling appointment by token:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * List appointments with filters
   */
  async listAppointments(
    tenantId: string,
    filters: AppointmentFilters = {}
  ): Promise<{ appointments: IAppointment[]; total: number }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const skip = (page - 1) * limit;

      const query: any = {
        tenantId: new mongoose.Types.ObjectId(tenantId),
      };

      // Apply date range filter
      if (filters.startDate || filters.endDate) {
        query.startTime = {};
        if (filters.startDate) {
          query.startTime.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.startTime.$lte = filters.endDate;
        }
      }

      // Apply status filter
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query.status = { $in: filters.status };
        } else {
          query.status = filters.status;
        }
      }

      // Apply customer filter
      if (filters.customerId) {
        query.customerId = new mongoose.Types.ObjectId(filters.customerId);
      }

      // Apply staff filter
      if (filters.staffId) {
        query.staffId = new mongoose.Types.ObjectId(filters.staffId);
      }

      const [appointments, total] = await Promise.all([
        Appointment.find(query)
          .populate('serviceId', 'name durationMinutes price')
          .populate('customerId', 'name email phone')
          .populate('staffId', 'name email')
          .sort({ startTime: 1 }) // Sort by date and time ascending
          .skip(skip)
          .limit(limit),
        Appointment.countDocuments(query),
      ]);

      return { appointments, total };
    } catch (error) {
      logger.error('Error listing appointments:', error);
      throw error;
    }
  }

  /**
   * Get appointments for calendar view
   */
  async getCalendarAppointments(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IAppointment[]> {
    try {
      const appointments = await Appointment.find({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        startTime: {
          $gte: startDate,
          $lte: endDate,
        },
      })
        .populate('serviceId', 'name durationMinutes price')
        .populate('customerId', 'name email phone')
        .populate('staffId', 'name email')
        .sort({ startTime: 1 });

      return appointments;
    } catch (error) {
      logger.error('Error fetching calendar appointments:', error);
      throw error;
    }
  }

  /**
   * Generate a secure reschedule token
   */
  private generateRescheduleToken(): string {
    return randomBytes(32).toString('hex');
  }
}

export const appointmentService = new AppointmentService();
