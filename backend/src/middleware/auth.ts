import { NextFunction, Request, Response } from 'express';
import { authService, TokenPayload } from '../services/authService';
import { logger } from '../utils/logger';

// Extend Express Request to include user and tenant info
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      tenantId?: string;
    }
  }
}

/**
 * Middleware to authenticate JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = authService.verifyToken(token);

    // Attach user info to request
    req.user = payload;
    req.tenantId = payload.tenantId;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);

    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        res.status(401).json({
          success: false,
          error: 'Token expired',
        });
        return;
      }

      if (error.message === 'Invalid token') {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
        });
        return;
      }
    }

    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = authService.verifyToken(token);
      req.user = payload;
      req.tenantId = payload.tenantId;
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Re-export tenant middleware for convenience
export { resolveTenant } from './tenant';
