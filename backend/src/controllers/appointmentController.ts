import { Request, Response } from 'express';
import { z } from 'zod';
import { appointmentService } from '../services/appointmentService';
import { logger } from '../utils/logger';

// Validation schemas
const createAppointmentSchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required'),
  startTime: z.string().datetime('Invalid start time format'),
  endTime: z.string().datetime('Invalid end time format'),
  customerTimezone: z.string().min(1, 'Customer timezone is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email('Invalid email format'),
  customerPhone: z.string().optional(),
  staffId: z.string().optional(),
  notes: z.string().optional(),
  paymentOption: z.enum(['prepaid', 'pay_at_venue'], {
    errorMap: () => ({ message: 'Payment option must be prepaid or pay_at_venue' }),
  }),
  amount: z.number().positive().optional(),
});

const updateAppointmentSchema = z.object({
  status: z.enum(['confirmed', 'completed', 'cancelled', 'no-show']).optional(),
  notes: z.string().optional(),
  paymentStatus: z.enum(['unpaid', 'paid', 'refunded']).optional(),
  paymentId: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['confirmed', 'completed', 'cancelled', 'no-show'], {
    errorMap: () => ({
      message: 'Status must be confirmed, completed, cancelled, or no-show',
    }),
  }),
});

const rescheduleSchema = z.object({
  newStartTime: z.string().datetime('Invalid start time format'),
  newEndTime: z.string().datetime('Invalid end time format'),
});

const listAppointmentsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.union([z.string(), z.array(z.string())]).optional(),
  customerId: z.string().optional(),
  staffId: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const calendarViewSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
});

/**
 * Create a new appointment
 */
export async function createAppointment(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validate request body
    const validationResult = createAppointmentSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
      return;
    }

    const data = validationResult.data;

    // Convert date strings to Date objects
    const appointmentData = {
      ...data,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
    };

    const appointment = await appointmentService.createAppointment(tenantId, appointmentData);

    res.status(201).json({
      success: true,
      data: appointment,
    });
  } catch (error: any) {
    logger.error('Error in createAppointment controller:', error);
    if (error.message.includes('not found') || error.message.includes('inactive')) {
      res.status(404).json({ error: error.message });
    } else if (
      error.message.includes('no longer available') ||
      error.message.includes('required')
    ) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create appointment' });
    }
  }
}

/**
 * Get appointment by ID
 */
export async function getAppointment(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const appointment = await appointmentService.getAppointmentById(id, tenantId);

    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    logger.error('Error in getAppointment controller:', error);
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
}

/**
 * Update appointment
 */
export async function updateAppointment(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    // Validate request body
    const validationResult = updateAppointmentSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
      return;
    }

    const appointment = await appointmentService.updateAppointment(
      id,
      tenantId,
      validationResult.data
    );

    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error: any) {
    logger.error('Error in updateAppointment controller:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
}

/**
 * Update appointment status
 */
export async function updateAppointmentStatus(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    // Validate request body
    const validationResult = updateStatusSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
      return;
    }

    const appointment = await appointmentService.updateAppointmentStatus(
      id,
      tenantId,
      validationResult.data.status
    );

    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    logger.error('Error in updateAppointmentStatus controller:', error);
    res.status(500).json({ error: 'Failed to update appointment status' });
  }
}

/**
 * Cancel appointment
 */
export async function cancelAppointment(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { reason } = req.body;

    const appointment = await appointmentService.cancelAppointment(id, tenantId, reason);

    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    logger.error('Error in cancelAppointment controller:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
}

/**
 * Reschedule appointment
 */
export async function rescheduleAppointment(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    // Validate request body
    const validationResult = rescheduleSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
      return;
    }

    const data = validationResult.data;
    const rescheduleData = {
      newStartTime: new Date(data.newStartTime),
      newEndTime: new Date(data.newEndTime),
    };

    const appointment = await appointmentService.rescheduleAppointment(
      id,
      tenantId,
      rescheduleData
    );

    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error: any) {
    logger.error('Error in rescheduleAppointment controller:', error);
    if (error.message.includes('Cannot reschedule')) {
      res.status(400).json({ error: error.message });
    } else if (error.message.includes('not available')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to reschedule appointment' });
    }
  }
}

/**
 * List appointments with filters
 */
export async function listAppointments(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validate query parameters
    const validationResult = listAppointmentsSchema.safeParse(req.query);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
      return;
    }

    const query = validationResult.data;

    // Build filters
    const filters: any = {};

    if (query.startDate) {
      // If it's a date string (YYYY-MM-DD), set to start of day
      const startDate = new Date(query.startDate);
      if (query.startDate.length === 10) {
        // Date string format, set to start of day
        startDate.setHours(0, 0, 0, 0);
      }
      filters.startDate = startDate;
    }
    if (query.endDate) {
      // If it's a date string (YYYY-MM-DD), set to end of day
      const endDate = new Date(query.endDate);
      if (query.endDate.length === 10) {
        // Date string format, set to end of day
        endDate.setHours(23, 59, 59, 999);
      }
      filters.endDate = endDate;
    }
    if (query.status) {
      filters.status = query.status;
    }
    if (query.customerId) {
      filters.customerId = query.customerId;
    }
    if (query.staffId) {
      filters.staffId = query.staffId;
    }
    if (query.page) {
      filters.page = parseInt(query.page, 10);
    }
    if (query.limit) {
      filters.limit = parseInt(query.limit, 10);
    }

    const result = await appointmentService.listAppointments(tenantId, filters);

    res.json({
      success: true,
      data: result.appointments,
      total: result.total,
    });
  } catch (error) {
    logger.error('Error in listAppointments controller:', error);
    res.status(500).json({ error: 'Failed to list appointments' });
  }
}

/**
 * Get appointments for calendar view
 */
export async function getCalendarAppointments(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validate query parameters
    const validationResult = calendarViewSchema.safeParse(req.query);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
      return;
    }

    const { startDate, endDate } = validationResult.data;

    const appointments = await appointmentService.getCalendarAppointments(
      tenantId,
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    logger.error('Error in getCalendarAppointments controller:', error);
    res.status(500).json({ error: 'Failed to fetch calendar appointments' });
  }
}

/**
 * Get appointment by reschedule token (public endpoint)
 */
export async function getAppointmentByToken(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.params;

    const appointment = await appointmentService.getAppointmentByToken(token);

    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    logger.error('Error in getAppointmentByToken controller:', error);
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
}

/**
 * Reschedule appointment by token (public endpoint)
 */
export async function rescheduleAppointmentByToken(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.params;

    // Validate request body
    const validationResult = rescheduleSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
      return;
    }

    const data = validationResult.data;
    const rescheduleData = {
      newStartTime: new Date(data.newStartTime),
      newEndTime: new Date(data.newEndTime),
    };

    const appointment = await appointmentService.rescheduleAppointmentByToken(
      token,
      rescheduleData
    );

    if (!appointment) {
      res.status(404).json({ error: 'Invalid reschedule token' });
      return;
    }

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error: any) {
    logger.error('Error in rescheduleAppointmentByToken controller:', error);
    if (error.message.includes('Cannot reschedule') || error.message.includes('Invalid')) {
      res.status(400).json({ error: error.message });
    } else if (error.message.includes('not available')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to reschedule appointment' });
    }
  }
}
