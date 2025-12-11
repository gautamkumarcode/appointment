import { Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { z } from 'zod';
import { authService } from '../services/authService';
import { tenantService } from '../services/tenantService';
import { logger } from '../utils/logger';

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

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
  // Widget configuration fields
  chatWelcomeMessage: z.string().optional(),
  bookingUrl: z.string().url().optional().or(z.literal('')),
  showWidgetBranding: z.boolean().optional(),
});

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/logos/');
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
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
      const { user } = await authService.register({
        email: validatedData.email,
        password: validatedData.ownerPassword,
        name: validatedData.ownerName,
        tenantId: tenant._id.toString(),
        role: 'owner',
      });

      // Create session
      req.session.userId = user._id.toString();
      req.session.tenantId = tenant._id.toString();
      req.session.email = user.email;
      req.session.role = user.role;

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
          _id: tenant._id.toString(),
          id: tenant._id.toString(), // Keep both for compatibility
          slug: tenant.slug,
          businessName: tenant.businessName,
          email: tenant.email,
          phone: tenant.phone,
          timezone: tenant.timezone,
          currency: tenant.currency,
          logo: tenant.logo,
          primaryColor: tenant.primaryColor,
          settings: tenant.settings,
          // Widget configuration fields
          chatWelcomeMessage: tenant.chatWelcomeMessage,
          bookingUrl: tenant.bookingUrl,
          showWidgetBranding: tenant.showWidgetBranding,
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
   * Upload tenant logo
   * POST /api/tenants/me/logo
   */
  async uploadLogo(req: RequestWithFile, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
        return;
      }

      // Generate URL for the uploaded file
      const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
      const logoUrl = `${baseUrl}/uploads/logos/${req.file.filename}`;

      res.status(200).json({
        success: true,
        data: {
          url: logoUrl,
        },
      });
    } catch (error) {
      logger.error('Upload logo error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload logo',
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

  /**
   * Register a domain for widget usage
   */
  async registerDomain(req: Request, res: Response): Promise<void> {
    try {
      const { domain } = req.body;
      const tenantId = (req as any).tenantId;

      if (!domain) {
        res.status(400).json({
          success: false,
          error: 'Domain is required',
        });
        return;
      }

      // Clean up the domain (remove protocol, trailing slash, etc.)
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

      const updatedTenant = await tenantService.addAllowedDomain(tenantId, cleanDomain);

      res.json({
        success: true,
        data: {
          allowedDomains: updatedTenant.allowedDomains,
        },
      });
    } catch (error) {
      logger.error('Error registering domain:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register domain',
      });
    }
  }

  /**
   * Get multer upload middleware
   */
  getUploadMiddleware() {
    return upload.single('logo');
  }
}

export const tenantController = new TenantController();
