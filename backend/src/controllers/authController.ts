import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/authService';
import { logger } from '../utils/logger';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  tenantId: z.string().min(1, 'Tenant ID is required'),
  role: z.enum(['owner', 'admin', 'staff']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  tenantId: z.string().optional(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validatedData = registerSchema.parse(req.body);

      // Register user
      const { user, tokens } = await authService.register(validatedData);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenantId,
          },
          tokens,
        },
      });
    } catch (error) {
      logger.error('Register controller error:', error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }

      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          res.status(409).json({
            success: false,
            error: error.message,
          });
          return;
        }

        if (error.message === 'Tenant not found') {
          res.status(404).json({
            success: false,
            error: error.message,
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: 'Registration failed',
      });
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validatedData = loginSchema.parse(req.body);

      // Login user
      const { user, tokens } = await authService.login(validatedData);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenantId,
          },
          tokens,
        },
      });
    } catch (error) {
      logger.error('Login controller error:', error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }

      if (error instanceof Error && error.message === 'Invalid credentials') {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Login failed',
      });
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { refreshToken } = refreshTokenSchema.parse(req.body);

      // Refresh token
      const tokens = await authService.refreshToken(refreshToken);

      res.status(200).json({
        success: true,
        data: { tokens },
      });
    } catch (error) {
      logger.error('Refresh token controller error:', error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }

      if (error instanceof Error) {
        if (error.message === 'Token expired' || error.message === 'Invalid token') {
          res.status(401).json({
            success: false,
            error: error.message,
          });
          return;
        }

        if (error.message === 'User not found') {
          res.status(404).json({
            success: false,
            error: error.message,
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: 'Token refresh failed',
      });
    }
  }

  /**
   * Get current user info
   * GET /api/auth/me
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      // Get user details
      const user = await authService.getUserById(req.user.userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenantId,
          },
        },
      });
    } catch (error) {
      logger.error('Get current user error:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get user info',
      });
    }
  }
}

export const authController = new AuthController();
