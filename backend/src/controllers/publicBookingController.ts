import { Request, Response } from 'express';
import { z } from 'zod';
import { appointmentService } from '../services/appointmentService';
import { serviceService } from '../services/serviceService';
import { tenantService } from '../services/tenantService';
import { logger } from '../utils/logger';
import { getPublicAvailableSlots } from './availabilityController';

// Validation schemas
const createPublicBookingSchema = z.object({
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

/**
 * Middleware to resolve tenant by slug for public endpoints
 */
export async function resolveTenantBySlug(
  req: Request,
  res: Response,
  next: Function
): Promise<void> {
  try {
    const { tenantSlug } = req.params;

    if (!tenantSlug) {
      res.status(400).json({ error: 'Tenant slug is required' });
      return;
    }

    const tenant = await tenantService.getTenantBySlug(tenantSlug);

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    // Add tenant info to request
    (req as any).tenantId = tenant._id.toString();
    (req as any).tenant = tenant;

    next();
  } catch (error) {
    logger.error('Error resolving tenant by slug:', error);
    res.status(500).json({ error: 'Failed to resolve tenant' });
  }
}

/**
 * Get tenant branding information (public endpoint)
 * GET /api/public/:tenantSlug/info
 */
export async function getTenantInfo(req: Request, res: Response): Promise<void> {
  try {
    const tenant = (req as any).tenant;

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    // Return only public branding information
    const tenantInfo = {
      _id: tenant._id.toString(), // Include tenant ID for chat widget
      businessName: tenant.businessName,
      logo: tenant.logo,
      primaryColor: tenant.primaryColor,
      timezone: tenant.timezone,
      currency: tenant.currency,
    };

    res.json({
      success: true,
      data: tenantInfo,
    });
  } catch (error) {
    logger.error('Error in getTenantInfo controller:', error);
    res.status(500).json({ error: 'Failed to fetch tenant information' });
  }
}

/**
 * Get tenant staff (public endpoint)
 * GET /api/public/:tenantSlug/staff
 */
export async function getPublicStaff(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    // Import staff service here to avoid circular dependencies
    const { staffService } = await import('../services/staffService');

    // Only return active staff for public booking
    const staff = await staffService.listStaff(tenantId);

    // Only return necessary fields for public booking
    const publicStaff = staff.map(staffMember => ({
      _id: staffMember._id,
      name: staffMember.name,
    }));

    res.json({
      success: true,
      data: publicStaff,
    });
  } catch (error) {
    logger.error('Error in getPublicStaff controller:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
}

/**
 * Get tenant services (public endpoint)
 * GET /api/public/:tenantSlug/services
 */
export async function getPublicServices(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    // Only return active services for public booking
    const services = await serviceService.listServices(tenantId, {
      isActive: true,
      includeDeleted: false,
    });

    res.json({
      success: true,
      data: services,
    });
  } catch (error) {
    logger.error('Error in getPublicServices controller:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
}

/**
 * Create booking (public endpoint)
 * POST /api/public/:tenantSlug/book
 */
export async function createPublicBooking(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    // Validate request body
    const validationResult = createPublicBookingSchema.safeParse(req.body);
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

    // Transform the response to include customer data directly for easier access
    // Note: appointment is already transformed by appointmentService, no need for toObject()
    const transformedAppointment = appointment as any;
    const responseData = {
      ...appointment,
      customerName: transformedAppointment.customer?.name || data.customerName,
      customerEmail: transformedAppointment.customer?.email || data.customerEmail,
      customerPhone: transformedAppointment.customer?.phone || data.customerPhone,
      serviceName: transformedAppointment.service?.name,
      staffName: transformedAppointment.staff?.name,
    };

    res.status(201).json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    logger.error('Error in createPublicBooking controller:', error);
    if (error.message.includes('not found') || error.message.includes('inactive')) {
      res.status(404).json({ error: error.message });
    } else if (
      error.message.includes('no longer available') ||
      error.message.includes('required')
    ) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create booking' });
    }
  }
}

/**
 * Get appointment by ID with token (public endpoint)
 * GET /api/public/:tenantSlug/appointment/:id
 */
export async function getPublicAppointment(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;
    const { token } = req.query;

    if (!tenantId) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    if (!token) {
      res.status(400).json({ error: 'Access token is required' });
      return;
    }

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    // Get appointment and verify it belongs to the tenant
    const appointment = await appointmentService.getAppointmentById(id, tenantId);

    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    // Verify token (using reschedule token for now, could be extended for other tokens)
    if (appointment.rescheduleToken !== token) {
      res.status(403).json({ error: 'Invalid access token' });
      return;
    }

    // Transform the response to include customer data directly for easier access
    // Note: appointment is already transformed by appointmentService, no need for toObject()
    const transformedAppointment = appointment as any;
    const responseData = {
      ...appointment,
      customerName: transformedAppointment.customer?.name,
      customerEmail: transformedAppointment.customer?.email,
      customerPhone: transformedAppointment.customer?.phone,
      serviceName: transformedAppointment.service?.name,
      staffName: transformedAppointment.staff?.name,
    };

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    logger.error('Error in getPublicAppointment controller:', error);
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
}

export default {
  resolveTenantBySlug,
  getPublicServices,
  getPublicAvailableSlots,
  createPublicBooking,
  getPublicAppointment,
};
