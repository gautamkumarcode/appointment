import { Tenant } from '../models/Tenant';
import { logger } from '../utils/logger';

export interface MessengerConfig {
  pageId: string;
  accessToken: string;
  verifyToken: string;
  appSecret: string;
  isEnabled: boolean;
}

class MessengerConfigService {
  /**
   * Set Messenger configuration for a tenant
   */
  async setMessengerConfig(tenantId: string, config: MessengerConfig): Promise<boolean> {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Update tenant settings with Messenger configuration
      const settings = tenant.settings || {};
      settings.messenger = {
        pageId: config.pageId,
        accessToken: config.accessToken,
        verifyToken: config.verifyToken,
        appSecret: config.appSecret,
        isEnabled: config.isEnabled,
        configuredAt: new Date(),
      };

      tenant.settings = settings;
      await tenant.save();

      logger.info(`Messenger configuration updated for tenant: ${tenantId}`);
      return true;
    } catch (error) {
      logger.error('Error setting Messenger configuration:', error);
      return false;
    }
  }

  /**
   * Get Messenger configuration for a tenant
   */
  async getMessengerConfig(tenantId: string): Promise<MessengerConfig | null> {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant || !tenant.settings?.messenger) {
        return null;
      }

      const config = tenant.settings.messenger as any;
      return {
        pageId: config.pageId,
        accessToken: config.accessToken,
        verifyToken: config.verifyToken,
        appSecret: config.appSecret,
        isEnabled: config.isEnabled || false,
      };
    } catch (error) {
      logger.error('Error getting Messenger configuration:', error);
      return null;
    }
  }

  /**
   * Find tenant by Messenger page ID
   */
  async findTenantByPageId(pageId: string): Promise<string | null> {
    try {
      const tenant = await Tenant.findOne({
        'settings.messenger.pageId': pageId,
        'settings.messenger.isEnabled': true,
      });

      return tenant?._id.toString() || null;
    } catch (error) {
      logger.error('Error finding tenant by page ID:', error);
      return null;
    }
  }

  /**
   * Enable/disable Messenger for a tenant
   */
  async toggleMessenger(tenantId: string, enabled: boolean): Promise<boolean> {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant || !tenant.settings?.messenger) {
        throw new Error('Messenger not configured for this tenant');
      }

      (tenant.settings.messenger as any).isEnabled = enabled;
      await tenant.save();

      logger.info(`Messenger ${enabled ? 'enabled' : 'disabled'} for tenant: ${tenantId}`);
      return true;
    } catch (error) {
      logger.error('Error toggling Messenger:', error);
      return false;
    }
  }

  /**
   * Validate Messenger configuration
   */
  validateConfig(config: Partial<MessengerConfig>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.pageId) {
      errors.push('Page ID is required');
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
   * Test Messenger configuration by sending a test message
   */
  async testConfiguration(tenantId: string, testUserId: string): Promise<boolean> {
    try {
      const config = await this.getMessengerConfig(tenantId);
      if (!config || !config.isEnabled) {
        throw new Error('Messenger not configured or disabled');
      }

      // Create a temporary Messenger service instance with tenant config
      // For now, we'll use the global service
      const { messengerService } = await import('./messengerService');

      const testMessage =
        'This is a test message from your appointment booking system. Messenger integration is working correctly!';

      return await messengerService.sendTextMessage(testUserId, testMessage);
    } catch (error) {
      logger.error('Error testing Messenger configuration:', error);
      return false;
    }
  }

  /**
   * Set up Messenger profile for a tenant
   */
  async setupMessengerProfile(tenantId: string): Promise<boolean> {
    try {
      const config = await this.getMessengerConfig(tenantId);
      if (!config || !config.isEnabled) {
        return false;
      }

      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return false;
      }

      const { messengerService } = await import('./messengerService');

      // Set greeting message
      const greeting = `Hi! Welcome to ${tenant.businessName}. I'm here to help you book an appointment. How can I assist you today?`;
      await messengerService.setGreeting(greeting);

      // Set persistent menu
      const menuItems = [
        {
          type: 'postback' as const,
          title: 'Book Appointment',
          payload: 'BOOK_APPOINTMENT',
        },
        {
          type: 'postback' as const,
          title: 'View Services',
          payload: 'VIEW_SERVICES',
        },
        {
          type: 'postback' as const,
          title: 'Business Hours',
          payload: 'BUSINESS_HOURS',
        },
      ];

      await messengerService.setPersistentMenu(menuItems);

      logger.info(`Messenger profile set up for tenant: ${tenantId}`);
      return true;
    } catch (error) {
      logger.error('Error setting up Messenger profile:', error);
      return false;
    }
  }

  /**
   * Get all tenants with Messenger enabled
   */
  async getEnabledTenants(): Promise<Array<{ tenantId: string; pageId: string }>> {
    try {
      const tenants = await Tenant.find({
        'settings.messenger.isEnabled': true,
      }).select('_id settings.messenger.pageId');

      return tenants.map((tenant) => ({
        tenantId: tenant._id.toString(),
        pageId: (tenant.settings.messenger as any).pageId,
      }));
    } catch (error) {
      logger.error('Error getting enabled Messenger tenants:', error);
      return [];
    }
  }
}

export const messengerConfigService = new MessengerConfigService();
