import { addDays, parseISO } from 'date-fns';
import { Request, Response } from 'express';
import { z } from 'zod';
import {
  checkSlotAvailability,
  generateTimeSlots,
  SlotGenerationParams,
} from '../services/availabilityService';
import { isValidTimezone } from '../utils/timezone';

// Validation schemas
const getSlotsSchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required'),
  staffId: z.string().optional(),
  startDate: z.string().optional(), // ISO date string
  endDate: z.string().optional(), // ISO date string
  timezone: z.string().min(1, 'Timezone is required'),
});

const checkSlotSchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required'),
  startTime: z.string().min(1, 'Start time is required'), // ISO string
  endTime: z.string().min(1, 'End time is required'), // ISO string
  staffId: z.string().optional(),
});

/**
 * Get available time slots
 * GET /api/availability/slots
 */
export async function getAvailableSlots(req: Request, res: Response): Promise<void> {
  try {
    // Validate query parameters
    const validation = getSlotsSchema.safeParse(req.query);

    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
      return;
    }

    const { serviceId, staffId, startDate, endDate, timezone } = validation.data;

    // Validate timezone
    if (!isValidTimezone(timezone)) {
      res.status(400).json({
        error: 'Invalid timezone',
      });
      return;
    }

    // Get tenant ID from request (set by tenant middleware)
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(401).json({
        error: 'Tenant not found',
      });
      return;
    }

    // Parse dates or use defaults (today + 30 days)
    const start = startDate ? parseISO(startDate) : new Date();
    const end = endDate ? parseISO(endDate) : addDays(new Date(), 30);

    // Generate slots
    const params: SlotGenerationParams = {
      tenantId,
      serviceId,
      staffId,
      startDate: start,
      endDate: end,
      timezone,
    };

    const slots = await generateTimeSlots(params);

    res.json({
      slots,
      count: slots.length,
    });
  } catch (error: any) {
    console.error('Error getting available slots:', error);
    res.status(500).json({
      error: 'Failed to get available slots',
      message: error.message,
    });
  }
}

/**
 * Check if a specific slot is available
 * POST /api/availability/check
 */
export async function checkSlot(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const validation = checkSlotSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
      return;
    }

    const { serviceId, startTime, endTime, staffId } = validation.data;

    // Get tenant ID from request
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(401).json({
        error: 'Tenant not found',
      });
      return;
    }

    // Parse dates
    const startTimeDate = parseISO(startTime);
    const endTimeDate = parseISO(endTime);

    // Check availability
    const isAvailable = await checkSlotAvailability(
      tenantId,
      serviceId,
      startTimeDate,
      endTimeDate,
      staffId
    );

    res.json({
      available: isAvailable,
      slot: {
        startTime,
        endTime,
        serviceId,
        staffId,
      },
    });
  } catch (error: any) {
    console.error('Error checking slot availability:', error);
    res.status(500).json({
      error: 'Failed to check slot availability',
      message: error.message,
    });
  }
}

/**
 * Get available time slots for public booking (no auth required)
 * GET /api/public/:tenantSlug/availability
 */
export async function getPublicAvailableSlots(req: Request, res: Response): Promise<void> {
  try {
    // Validate query parameters
    const validation = getSlotsSchema.safeParse(req.query);

    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
      return;
    }

    const { serviceId, staffId, startDate, endDate, timezone } = validation.data;

    // Validate timezone
    if (!isValidTimezone(timezone)) {
      res.status(400).json({
        error: 'Invalid timezone',
      });
      return;
    }

    // Get tenant ID from request (set by public tenant middleware)
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(404).json({
        error: 'Tenant not found',
      });
      return;
    }

    // Parse dates or use defaults
    const start = startDate ? parseISO(startDate) : new Date();
    const end = endDate ? parseISO(endDate) : addDays(new Date(), 30);

    // Generate slots
    const params: SlotGenerationParams = {
      tenantId,
      serviceId,
      staffId,
      startDate: start,
      endDate: end,
      timezone,
    };

    const slots = await generateTimeSlots(params);

    res.json({
      slots,
      count: slots.length,
    });
  } catch (error: any) {
    console.error('Error getting public available slots:', error);
    res.status(500).json({
      error: 'Failed to get available slots',
      message: error.message,
    });
  }
}

export default {
  getAvailableSlots,
  checkSlot,
  getPublicAvailableSlots,
};
