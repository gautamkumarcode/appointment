import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/authService';
import { tenantService } from '../services/tenantService';
import { logger } from '../utils/logger';

// Validation schemas
const createTenantSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().length(3, 'Currency must be 3 characters').optional(),
  ownerName: z.string().min(1, 'Owner name is required'),
  ownerPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const updateTenantSchema = z.object({
  businessName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().length(3).optional(),
  logo: z.string().optional(),
  primaryColor: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
});

export class TenantController {
  /**
   * Register a new tenant with owner account
   * POST /api/tenants/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validatedData = createTenantSchema.parse(req.body);

      // Create tenant
      const tenant = await tenantService.createTenant({
        businessName: validatedData.businessName,
        email: validatedData.email,
        phone: validatedData.phone,
        timezone: validatedData.timezone,
        currency: validatedData.currency,
      });

      // Create owner user account
      const { user, tokens } = await authService.register({
        email: validatedData.email,
        password: validatedData.ownerPassword,
        name: validatedData.ownerName,
        tenantId: tenant._id.toString(),
        role: 'owner',
      });

      res.status(201).json({
        success: true,
        data: {
          tenant: {
            id: tenant._id,
            slug: tenant.slug,
            businessName: tenant.businessName,
            email: tenant.email,
            phone: tenant.phone,
            timezone: tenant.timezone,
            currency: tenant.currency,
            bookingUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/book/${tenant.slug}`,
          },
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          tokens,
        },
      });
    } catch (error) {
      logger.error('Tenant registration error:', error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }

      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Tenant registration failed',
      });
    }
  }

  /**
   * Get current tenant details
   * GET /api/tenants/me
   */
  async getCurrentTenant(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const tenant = await tenantService.getTenantById(req.tenantId);

      if (!tenant) {
        res.status(404).json({
          success: false,
          error: 'Tenant not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          tenant: {
            id: tenant._id,
            slug: tenant.slug,
            businessName: tenant.businessName,
            email: tenant.email,
            phone: tenant.phone,
            timezone: tenant.timezone,
            currency: tenant.currency,
            logo: tenant.logo,
            primaryColor: tenant.primaryColor,
            settings: tenant.settings,
            bookingUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/book/${tenant.slug}`,
          },
        },
      });
    } catch (error) {
      logger.error('Get tenant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tenant',
      });
    }
  }

  /**
   * Update tenant settings
   * PUT /api/tenants/me
   */
  async updateTenant(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      // Validate request body
      const validatedData = updateTenantSchema.parse(req.body);

      // Update tenant
      const tenant = await tenantService.updateTenant(req.tenantId, validatedData);

      if (!tenant) {
        res.status(404).json({
          success: false,
          error: 'Tenant not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          tenant: {
            id: tenant._id,
            slug: tenant.slug,
            businessName: tenant.businessName,
            email: tenant.email,
            phone: tenant.phone,
            timezone: tenant.timezone,
            currency: tenant.currency,
            logo: tenant.logo,
            primaryColor: tenant.primaryColor,
            settings: tenant.settings,
          },
        },
      });
    } catch (error) {
      logger.error('Update tenant error:', error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update tenant',
      });
    }
  }

  /**
   * Get tenant by slug (public)
   * GET /api/tenants/slug/:slug
   */
  async getTenantBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;

      const tenant = await tenantService.getTenantBySlug(slug);

      if (!tenant) {
        res.status(404).json({
          success: false,
          error: 'Tenant not found',
        });
        return;
      }

      // Return only public information
      res.status(200).json({
        success: true,
        data: {
          tenant: {
            slug: tenant.slug,
            businessName: tenant.businessName,
            timezone: tenant.timezone,
            currency: tenant.currency,
            logo: tenant.logo,
            primaryColor: tenant.primaryColor,
          },
        },
      });
    } catch (error) {
      logger.error('Get tenant by slug error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tenant',
      });
    }
  }
}

export const tenantController = new TenantController();
