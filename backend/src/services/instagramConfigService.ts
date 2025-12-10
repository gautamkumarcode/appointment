import { Tenant } from '../models/Tenant';
import { logger } from '../utils/logger';

export interface InstagramConfig {
  pageId: string;
  instagramBusinessAccountId: string;
  accessToken: string;
  verifyToken: string;
  appSecret: string;
  isEnabled: boolean;
}

class InstagramConfigService {
  /**
   * Set Instagram configuration for a tenant
   */
  async setInstagramConfig(tenantId: string, config: InstagramConfig): Promise<boolean> {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Update tenant settings with Instagram configuration
      const settings = tenant.settings || {};
      settings.instagram = {
        pageId: config.pageId,
        instagramBusinessAccountId: config.instagramBusinessAccountId,
        accessToken: config.accessToken,
        verifyToken: config.verifyToken,
        appSecret: config.appSecret,
        isEnabled: config.isEnabled,
        configuredAt: new Date(),
      };

      tenant.settings = settings;
      await tenant.save();

      logger.info(`Instagram configuration updated for tenant: ${tenantId}`);
      return true;
    } catch (error) {
      logger.error('Error setting Instagram configuration:', error);
      return false;
    }
  }

  /**
   * Get Instagram configuration for a tenant
   */
  async getInstagramConfig(tenantId: string): Promise<InstagramConfig | null> {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant || !tenant.settings?.instagram) {
        return null;
      }

      const config = tenant.settings.instagram as any;
      return {
        pageId: config.pageId,
        instagramBusinessAccountId: config.instagramBusinessAccountId,
        accessToken: config.accessToken,
        verifyToken: config.verifyToken,
        appSecret: config.appSecret,
        isEnabled: config.isEnabled || false,
      };
    } catch (error) {
      logger.error('Error getting Instagram configuration:', error);
      return null;
    }
  }

  /**
   * Find tenant by Instagram Business Account ID
   */
  async findTenantByInstagramAccountId(instagramBusinessAccountId: string): Promise<string | null> {
    try {
      const tenant = await Tenant.findOne({
        'settings.instagram.instagramBusinessAccountId': instagramBusinessAccountId,
        'settings.instagram.isEnabled': true,
      });

      return tenant?._id.toString() || null;
    } catch (error) {
      logger.error('Error finding tenant by Instagram account ID:', error);
      return null;
    }
  }

  /**
   * Find tenant by Instagram page ID
   */
  async findTenantByPageId(pageId: string): Promise<string | null> {
    try {
      const tenant = await Tenant.findOne({
        'settings.instagram.pageId': pageId,
        'settings.instagram.isEnabled': true,
      });

      return tenant?._id.toString() || null;
    } catch (error) {
      logger.error('Error finding tenant by Instagram page ID:', error);
      return null;
    }
  }

  /**
   * Enable/disable Instagram for a tenant
   */
  async toggleInstagram(tenantId: string, enabled: boolean): Promise<boolean> {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant || !tenant.settings?.instagram) {
        throw new Error('Instagram not configured for this tenant');
      }

      (tenant.settings.instagram as any).isEnabled = enabled;
      await tenant.save();

      logger.info(`Instagram ${enabled ? 'enabled' : 'disabled'} for tenant: ${tenantId}`);
      return true;
    } catch (error) {
      logger.error('Error toggling Instagram:', error);
      return false;
    }
  }

  /**
   * Validate Instagram configuration
   */
  validateConfig(config: Partial<InstagramConfig>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.pageId) {
      errors.push('Page ID is required');
    }

    if (!config.instagramBusinessAccountId) {
      errors.push('Instagram Business Account ID is required');
    }

    if (!config.accessToken) {
      errors.push('Access Token is required');
    }

    if (!config.verifyToken) {
      errors.push('Verify Token is required');
    }

    if (!config.appSecret) {
      errors.push('App Secret is required');
    }

    // Validate page ID format (should be numeric)
    if (config.pageId && !/^\d+$/.test(config.pageId)) {
      errors.push('Page ID should contain only digits');
    }

    // Validate Instagram Business Account ID format (should be numeric)
    if (config.instagramBusinessAccountId && !/^\d+$/.test(config.instagramBusinessAccountId)) {
      errors.push('Instagram Business Account ID should contain only digits');
    }

    // Validate access token format
    if (config.accessToken && !config.accessToken.startsWith('EAA')) {
      errors.push('Access Token format appears invalid');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Test Instagram configuration by sending a test message
   */
  async testConfiguration(tenantId: string, testUserId: string): Promise<boolean> {
    try {
      const config = await this.getInstagramConfig(tenantId);
      if (!config || !config.isEnabled) {
        throw new Error('Instagram not configured or disabled');
      }

      // Create a temporary Instagram service instance with tenant config
      // For now, we'll use the global service
      const { instagramService } = await import('./instagramService');

      const testMessage =
        'This is a test message from your appointment booking system. Instagram integration is working correctly!';

      return await instagramService.sendTextMessage(testUserId, testMessage);
    } catch (error) {
      logger.error('Error testing Instagram configuration:', error);
      return false;
    }
  }

  /**
   * Auto-configure Instagram from Facebook Page
   */
  async autoConfigureFromPage(
    tenantId: string,
    pageId: string,
    pageAccessToken: string
  ): Promise<boolean> {
    try {
      const { instagramService } = await import('./instagramService');

      // Get Instagram Business Account ID from the page
      const instagramBusinessAccountId =
        await instagramService.getInstagramBusinessAccountId(pageId);

      if (!instagramBusinessAccountId) {
        throw new Error('No Instagram Business Account linked to this Facebook Page');
      }

      // Set up basic configuration
      const config: InstagramConfig = {
        pageId,
        instagramBusinessAccountId,
        accessToken: pageAccessToken,
        verifyToken: process.env.INSTAGRAM_VERIFY_TOKEN || '',
        appSecret: process.env.INSTAGRAM_APP_SECRET || '',
        isEnabled: true,
      };

      return await this.setInstagramConfig(tenantId, config);
    } catch (error) {
      logger.error('Error auto-configuring Instagram:', error);
      return false;
    }
  }

  /**
   * Get all tenants with Instagram enabled
   */
  async getEnabledTenants(): Promise<
    Array<{ tenantId: string; pageId: string; instagramBusinessAccountId: string }>
  > {
    try {
      const tenants = await Tenant.find({
        'settings.instagram.isEnabled': true,
      }).select('_id settings.instagram.pageId settings.instagram.instagramBusinessAccountId');

      return tenants.map((tenant) => ({
        tenantId: tenant._id.toString(),
        pageId: (tenant.settings.instagram as any).pageId,
        instagramBusinessAccountId: (tenant.settings.instagram as any).instagramBusinessAccountId,
      }));
    } catch (error) {
      logger.error('Error getting enabled Instagram tenants:', error);
      return [];
    }
  }

  /**
   * Sync Instagram Business Account information
   */
  async syncAccountInfo(tenantId: string): Promise<boolean> {
    try {
      const config = await this.getInstagramConfig(tenantId);
      if (!config || !config.isEnabled) {
        return false;
      }

      const { instagramService } = await import('./instagramService');
      const accountInfo = await instagramService.getAccountInfo();

      if (accountInfo) {
        // Update tenant with account information
        const tenant = await Tenant.findById(tenantId);
        if (tenant && tenant.settings?.instagram) {
          (tenant.settings.instagram as any).accountInfo = accountInfo;
          (tenant.settings.instagram as any).lastSyncAt = new Date();
          await tenant.save();
        }
      }

      return !!accountInfo;
    } catch (error) {
      logger.error('Error syncing Instagram account info:', error);
      return false;
    }
  }
}

export const instagramConfigService = new InstagramConfigService();
