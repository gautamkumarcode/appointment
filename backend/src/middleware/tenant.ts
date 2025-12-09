import { NextFunction, Request, Response } from 'express';
import { Tenant } from '../models/Tenant';
import { logger } from '../utils/logger';

/**
 * Middleware to resolve and validate tenant from JWT token
 * Must be used after authenticate middleware
 */
export const resolveTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.tenantId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Verify tenant exists
    const tenant = await Tenant.findById(req.tenantId);

    if (!tenant) {
      res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
      return;
    }

    // Tenant is already set in req.tenantId by authenticate middleware
    next();
  } catch (error) {
    logger.error('Tenant resolution error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve tenant',
    });
  }
};
