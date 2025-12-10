import { Request, Response } from 'express';
import { z } from 'zod';
import { analyticsService } from '../services/analyticsService';
import { logger } from '../utils/logger';

// Validation schemas
const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const monthlyAnalyticsSchema = z.object({
  year: z.string().optional(),
});

/**
 * Get booking analytics
 */
export async function getBookingAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validate query parameters
    const validationResult = analyticsQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
      return;
    }

    const query = validationResult.data;
    const filters: any = {};

    if (query.startDate) {
      filters.startDate = new Date(query.startDate);
    }
    if (query.endDate) {
      filters.endDate = new Date(query.endDate);
    }

    const analytics = await analyticsService.getAnalytics(tenantId, filters);
    res.json(analytics);
  } catch (error) {
    logger.error('Error in getBookingAnalytics controller:', error);
    res.status(500).json({ error: 'Failed to fetch booking analytics' });
  }
}

/**
 * Get detailed analytics with breakdowns
 */
export async function getDetailedAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validate query parameters
    const validationResult = analyticsQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
      return;
    }

    const query = validationResult.data;
    const filters: any = {};

    if (query.startDate) {
      filters.startDate = new Date(query.startDate);
    }
    if (query.endDate) {
      filters.endDate = new Date(query.endDate);
    }

    const analytics = await analyticsService.getDetailedAnalytics(tenantId, filters);
    res.json(analytics);
  } catch (error) {
    logger.error('Error in getDetailedAnalytics controller:', error);
    res.status(500).json({ error: 'Failed to fetch detailed analytics' });
  }
}

/**
 * Get booking statistics
 */
export async function getTotalBookings(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validate query parameters
    const validationResult = analyticsQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
      return;
    }

    const query = validationResult.data;
    const filters: any = {};

    if (query.startDate) {
      filters.startDate = new Date(query.startDate);
    }
    if (query.endDate) {
      filters.endDate = new Date(query.endDate);
    }

    const bookingStats = await analyticsService.getBookingStats(tenantId, filters);
    res.json({ data: bookingStats });
  } catch (error) {
    logger.error('Error in getTotalBookings controller:', error);
    res.status(500).json({ error: 'Failed to fetch booking statistics' });
  }
}

/**
 * Get revenue statistics
 */
export async function getTotalRevenue(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validate query parameters
    const validationResult = analyticsQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
      return;
    }

    const query = validationResult.data;
    const filters: any = {};

    if (query.startDate) {
      filters.startDate = new Date(query.startDate);
    }
    if (query.endDate) {
      filters.endDate = new Date(query.endDate);
    }

    const revenueStats = await analyticsService.getRevenueStats(tenantId, filters);
    res.json({ data: revenueStats });
  } catch (error) {
    logger.error('Error in getTotalRevenue controller:', error);
    res.status(500).json({ error: 'Failed to fetch revenue statistics' });
  }
}

/**
 * Get no-show statistics
 */
export async function getNoShowCount(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validate query parameters
    const validationResult = analyticsQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
      return;
    }

    const query = validationResult.data;
    const filters: any = {};

    if (query.startDate) {
      filters.startDate = new Date(query.startDate);
    }
    if (query.endDate) {
      filters.endDate = new Date(query.endDate);
    }

    const noShowStats = await analyticsService.getNoShowStats(tenantId, filters);
    res.json({ data: noShowStats });
  } catch (error) {
    logger.error('Error in getNoShowCount controller:', error);
    res.status(500).json({ error: 'Failed to fetch no-show statistics' });
  }
}

/**
 * Get repeat customer count
 */
export async function getRepeatCustomerCount(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validate query parameters
    const validationResult = analyticsQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
      return;
    }

    const query = validationResult.data;
    const filters: any = {};

    if (query.startDate) {
      filters.startDate = new Date(query.startDate);
    }
    if (query.endDate) {
      filters.endDate = new Date(query.endDate);
    }

    const repeatCustomerCount = await analyticsService.getRepeatCustomerCount(tenantId, filters);
    res.json({ repeatCustomerCount });
  } catch (error) {
    logger.error('Error in getRepeatCustomerCount controller:', error);
    res.status(500).json({ error: 'Failed to fetch repeat customer count' });
  }
}

/**
 * Get customer analytics
 */
export async function getCustomerAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validate query parameters
    const validationResult = analyticsQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
      return;
    }

    const query = validationResult.data;
    const filters: any = {};

    if (query.startDate) {
      filters.startDate = new Date(query.startDate);
    }
    if (query.endDate) {
      filters.endDate = new Date(query.endDate);
    }

    const customerStats = await analyticsService.getCustomerAnalytics(tenantId, filters);
    res.json({ data: customerStats });
  } catch (error) {
    logger.error('Error in getCustomerAnalytics controller:', error);
    res.status(500).json({ error: 'Failed to fetch customer analytics' });
  }
}

/**
 * Get monthly analytics for the year
 */
export async function getMonthlyAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validate query parameters
    const validationResult = monthlyAnalyticsSchema.safeParse(req.query);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
      return;
    }

    const query = validationResult.data;
    const year = query.year ? parseInt(query.year, 10) : undefined;

    const monthlyAnalytics = await analyticsService.getMonthlyAnalytics(tenantId, year);
    res.json(monthlyAnalytics);
  } catch (error) {
    logger.error('Error in getMonthlyAnalytics controller:', error);
    res.status(500).json({ error: 'Failed to fetch monthly analytics' });
  }
}
