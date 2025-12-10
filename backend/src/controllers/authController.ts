import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/authService';
import { logger } from '../utils/logger';

// Extend Request interface to include session
declare module 'express-session' {
  interface SessionData {
    userId: string;
    tenantId: string;
    email: string;
    role: string;
  }
}

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

// Removed refreshTokenSchema as we're using sessions now

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
      const { user } = await authService.register(validatedData);

      // Create session
      req.session.userId = user._id.toString();
      req.session.tenantId = user.tenantId.toString();
      req.session.email = user.email;
      req.session.role = user.role;

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
      const { user } = await authService.login(validatedData);

      // Create session
      req.session.userId = user._id.toString();
      req.session.tenantId = user.tenantId.toString();
      req.session.email = user.email;
      req.session.role = user.role;

      console.log('✅ Session created on login:', {
        sessionID: req.sessionID,
        userId: req.session.userId,
        tenantId: req.session.tenantId,
        email: req.session.email,
      });

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
   * Logout user
   * POST /api/auth/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      req.session.destroy((err) => {
        if (err) {
          logger.error('Session destroy error:', err);
          res.status(500).json({
            success: false,
            error: 'Logout failed',
          });
          return;
        }

        res.clearCookie('connect.sid'); // Clear session cookie
        res.status(200).json({
          success: true,
          message: 'Logged out successfully',
        });
      });
    } catch (error) {
      logger.error('Logout controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed',
      });
    }
  }

  /**
   * Get current user info
   * GET /api/auth/me
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔍 /me endpoint - Session data:', {
        sessionID: req.sessionID,
        userId: req.session.userId,
        tenantId: req.session.tenantId,
        email: req.session.email,
      });

      if (!req.session.userId) {
        console.log('❌ No userId in session');
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      // Get user details
      const user = await authService.getUserById(req.session.userId);

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
