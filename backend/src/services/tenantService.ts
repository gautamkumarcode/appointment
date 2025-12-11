import { ITenant, Tenant } from '../models/Tenant';
import { logger } from '../utils/logger';

export interface CreateTenantDTO {
  businessName: string;
  email: string;
  phone?: string;
  timezone?: string;
  currency?: string;
}

export class TenantService {
  /**
   * Generate a unique slug from business name
   */
  private generateSlug(businessName: string): string {
    return businessName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .substring(0, 50); // Limit length
  }

  /**
   * Ensure slug is unique by appending number if needed
   */
  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (await Tenant.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Create a new tenant with default settings
   */
  async createTenant(data: CreateTenantDTO): Promise<ITenant> {
    try {
      // Generate unique slug
      const baseSlug = this.generateSlug(data.businessName);
      const slug = await this.ensureUniqueSlug(baseSlug);

      // Default settings
      const defaultSettings = {
        workingHours: {
          monday: [{ start: '09:00', end: '17:00' }],
          tuesday: [{ start: '09:00', end: '17:00' }],
          wednesday: [{ start: '09:00', end: '17:00' }],
          thursday: [{ start: '09:00', end: '17:00' }],
          friday: [{ start: '09:00', end: '17:00' }],
          saturday: [],
          sunday: [],
        },
        notifications: {
          email: true,
          sms: false,
          whatsapp: false,
        },
        booking: {
          requireStaffSelection: false,
          allowRescheduling: true,
          bufferTime: 0,
        },
      };

      // Create tenant
      const tenant = await Tenant.create({
        slug,
        businessName: data.businessName,
        email: data.email,
        phone: data.phone,
        timezone: data.timezone || 'UTC',
        currency: data.currency || 'USD',
        settings: defaultSettings,
      });

      logger.info(`Tenant created successfully: ${tenant.slug}`);

      return tenant;
    } catch (error) {
      logger.error('Create tenant error:', error);
      throw error;
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(tenantId: string): Promise<ITenant | null> {
    return Tenant.findById(tenantId);
  }

  /**
   * Get tenant by slug
   */
  async getTenantBySlug(slug: string): Promise<ITenant | null> {
    return Tenant.findOne({ slug: slug.toLowerCase() });
  }

  /**
   * Update tenant settings
   */
  async updateTenant(
    tenantId: string,
    updates: Partial<CreateTenantDTO & { settings: Record<string, unknown> }>
  ): Promise<ITenant | null> {
    try {
      const tenant = await Tenant.findByIdAndUpdate(
        tenantId,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (tenant) {
        logger.info(`Tenant updated successfully: ${tenant.slug}`);
      }

      return tenant;
    } catch (error) {
      logger.error('Update tenant error:', error);
      throw error;
    }
  }

  /**
   * Add an allowed domain for widget usage
   */
  async addAllowedDomain(tenantId: string, domain: string): Promise<ITenant> {
    try {
      const tenant = await Tenant.findByIdAndUpdate(
        tenantId,
        { $addToSet: { allowedDomains: domain } }, // $addToSet prevents duplicates
        { new: true, runValidators: true }
      );

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      logger.info(`Domain added to tenant ${tenant.slug}: ${domain}`);
      return tenant;
    } catch (error) {
      logger.error('Add allowed domain error:', error);
      throw error;
    }
  }

  /**
   * Check if slug is available
   */
  async isSlugAvailable(slug: string): Promise<boolean> {
    const tenant = await Tenant.findOne({ slug: slug.toLowerCase() });
    return !tenant;
  }
}

export const tenantService = new TenantService();
