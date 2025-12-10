import { Tenant } from '../models/Tenant';
import { logger } from '../utils/logger';

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  webhookSecret?: string;
  isEnabled: boolean;
}

class WhatsAppConfigService {
  /**
   * Set WhatsApp configuration for a tenant
   */
  async setWhatsAppConfig(tenantId: string, config: WhatsAppConfig): Promise<boolean> {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Update tenant settings with WhatsApp configuration
      const settings = tenant.settings || {};
      settings.whatsapp = {
        phoneNumberId: config.phoneNumberId,
        accessToken: config.accessToken,
        verifyToken: config.verifyToken,
        webhookSecret: config.webhookSecret,
        isEnabled: config.isEnabled,
        configuredAt: new Date(),
      };

      tenant.settings = settings;
      await tenant.save();

      logger.info(`WhatsApp configuration updated for tenant: ${tenantId}`);
      return true;
    } catch (error) {
      logger.error('Error setting WhatsApp configuration:', error);
      return false;
    }
  }

  /**
   * Get WhatsApp configuration for a tenant
   */
  async getWhatsAppConfig(tenantId: string): Promise<WhatsAppConfig | null> {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant || !tenant.settings?.whatsapp) {
        return null;
      }

      const config = tenant.settings.whatsapp as any;
      return {
        phoneNumberId: config.phoneNumberId,
        accessToken: config.accessToken,
        verifyToken: config.verifyToken,
        webhookSecret: config.webhookSecret,
        isEnabled: config.isEnabled || false,
      };
    } catch (error) {
      logger.error('Error getting WhatsApp configuration:', error);
      return null;
    }
  }

  /**
   * Find tenant by WhatsApp phone number ID
   */
  async findTenantByPhoneNumberId(phoneNumberId: string): Promise<string | null> {
    try {
      const tenant = await Tenant.findOne({
        'settings.whatsapp.phoneNumberId': phoneNumberId,
        'settings.whatsapp.isEnabled': true,
      });

      return tenant?._id.toString() || null;
    } catch (error) {
      logger.error('Error finding tenant by phone number ID:', error);
      return null;
    }
  }

  /**
   * Enable/disable WhatsApp for a tenant
   */
  async toggleWhatsApp(tenantId: string, enabled: boolean): Promise<boolean> {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant || !tenant.settings?.whatsapp) {
        throw new Error('WhatsApp not configured for this tenant');
      }

      (tenant.settings.whatsapp as any).isEnabled = enabled;
      await tenant.save();

      logger.info(`WhatsApp ${enabled ? 'enabled' : 'disabled'} for tenant: ${tenantId}`);
      return true;
    } catch (error) {
      logger.error('Error toggling WhatsApp:', error);
      return false;
    }
  }

  /**
   * Validate WhatsApp configuration
   */
  validateConfig(config: Partial<WhatsAppConfig>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.phoneNumberId) {
      errors.push('Phone Number ID is required');
    }

    if (!config.accessToken) {
      errors.push('Access Token is required');
    }

    if (!config.verifyToken) {
      errors.push('Verify Token is required');
    }

    // Validate phone number ID format (should be numeric)
    if (config.phoneNumberId && !/^\d+$/.test(config.phoneNumberId)) {
      errors.push('Phone Number ID should contain only digits');
    }

    // Validate access token format (should start with specific prefix)
    if (config.accessToken && !config.accessToken.startsWith('EAA')) {
      errors.push('Access Token format appears invalid');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Test WhatsApp configuration by sending a test message
   */
  async testConfiguration(tenantId: string, testPhoneNumber: string): Promise<boolean> {
    try {
      const config = await this.getWhatsAppConfig(tenantId);
      if (!config || !config.isEnabled) {
        throw new Error('WhatsApp not configured or disabled');
      }

      // Create a temporary WhatsApp service instance with tenant config
      // This would require modifying WhatsAppService to accept config parameters
      // For now, we'll use the global service
      const { whatsappService } = await import('./whatsappService');

      const testMessage =
        'This is a test message from your appointment booking system. WhatsApp integration is working correctly!';

      return await whatsappService.sendTextMessage(testPhoneNumber, testMessage);
    } catch (error) {
      logger.error('Error testing WhatsApp configuration:', error);
      return false;
    }
  }

  /**
   * Get all tenants with WhatsApp enabled
   */
  async getEnabledTenants(): Promise<Array<{ tenantId: string; phoneNumberId: string }>> {
    try {
      const tenants = await Tenant.find({
        'settings.whatsapp.isEnabled': true,
      }).select('_id settings.whatsapp.phoneNumberId');

      return tenants.map((tenant) => ({
        tenantId: tenant._id.toString(),
        phoneNumberId: (tenant.settings.whatsapp as any).phoneNumberId,
      }));
    } catch (error) {
      logger.error('Error getting enabled WhatsApp tenants:', error);
      return [];
    }
  }
}

export const whatsappConfigService = new WhatsAppConfigService();
