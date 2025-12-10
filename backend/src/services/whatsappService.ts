import crypto from 'crypto';
import { logger } from '../utils/logger';

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  text?: {
    body: string;
  };
  type: 'text' | 'image' | 'document' | 'audio' | 'video';
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: {
          name: string;
        };
        wa_id: string;
      }>;
      messages?: WhatsAppMessage[];
      statuses?: Array<{
        id: string;
        status: string;
        timestamp: string;
        recipient_id: string;
      }>;
    };
    field: string;
  }>;
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

class WhatsAppService {
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly verifyToken: string;
  private readonly webhookSecret: string;
  private readonly apiVersion: string = 'v18.0';
  private readonly baseUrl: string;

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || '';
    this.webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET || '';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;

    if (!this.accessToken || !this.phoneNumberId) {
      logger.warn('WhatsApp credentials not configured. WhatsApp features will be disabled.');
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      logger.warn('WhatsApp webhook secret not configured');
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      const receivedSignature = signature.replace('sha256=', '');

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
      );
    } catch (error) {
      logger.error('Error verifying WhatsApp webhook signature:', error);
      return false;
    }
  }

  /**
   * Verify webhook token for initial setup
   */
  verifyWebhookToken(token: string): boolean {
    return token === this.verifyToken;
  }

  /**
   * Send a text message via WhatsApp
   */
  async sendTextMessage(to: string, message: string): Promise<boolean> {
    if (!this.accessToken || !this.phoneNumberId) {
      logger.error('WhatsApp not configured');
      return false;
    }

    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''), // Remove non-digits
        type: 'text',
        text: {
          body: message,
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('WhatsApp API error:', errorData);
        return false;
      }

      const result = await response.json();
      logger.info('WhatsApp message sent successfully:', result);
      return true;
    } catch (error) {
      logger.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  /**
   * Send a template message via WhatsApp
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = 'en',
    parameters?: Array<{ type: 'text'; text: string }>
  ): Promise<boolean> {
    if (!this.accessToken || !this.phoneNumberId) {
      logger.error('WhatsApp not configured');
      return false;
    }

    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''), // Remove non-digits
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
          ...(parameters && {
            components: [
              {
                type: 'body',
                parameters,
              },
            ],
          }),
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('WhatsApp template API error:', errorData);
        return false;
      }

      const result = await response.json();
      logger.info('WhatsApp template message sent successfully:', result);
      return true;
    } catch (error) {
      logger.error('Error sending WhatsApp template message:', error);
      return false;
    }
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageId: string): Promise<boolean> {
    if (!this.accessToken || !this.phoneNumberId) {
      return false;
    }

    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      return response.ok;
    } catch (error) {
      logger.error('Error marking WhatsApp message as read:', error);
      return false;
    }
  }

  /**
   * Parse incoming webhook payload
   */
  parseWebhookPayload(payload: WhatsAppWebhookPayload): {
    messages: Array<{
      messageId: string;
      from: string;
      text: string;
      timestamp: Date;
      phoneNumberId: string;
    }>;
    statuses: Array<{
      messageId: string;
      status: string;
      timestamp: Date;
      recipientId: string;
    }>;
  } {
    const messages: Array<{
      messageId: string;
      from: string;
      text: string;
      timestamp: Date;
      phoneNumberId: string;
    }> = [];

    const statuses: Array<{
      messageId: string;
      status: string;
      timestamp: Date;
      recipientId: string;
    }> = [];

    if (payload.object !== 'whatsapp_business_account') {
      return { messages, statuses };
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') {
          continue;
        }

        const { value } = change;

        // Process incoming messages
        if (value.messages) {
          for (const message of value.messages) {
            if (message.type === 'text' && message.text?.body) {
              messages.push({
                messageId: message.id,
                from: message.from,
                text: message.text.body,
                timestamp: new Date(parseInt(message.timestamp) * 1000),
                phoneNumberId: value.metadata.phone_number_id,
              });
            }
          }
        }

        // Process message statuses
        if (value.statuses) {
          for (const status of value.statuses) {
            statuses.push({
              messageId: status.id,
              status: status.status,
              timestamp: new Date(parseInt(status.timestamp) * 1000),
              recipientId: status.recipient_id,
            });
          }
        }
      }
    }

    return { messages, statuses };
  }

  /**
   * Get phone number info
   */
  async getPhoneNumberInfo(): Promise<any> {
    if (!this.accessToken || !this.phoneNumberId) {
      return null;
    }

    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      logger.error('Error getting WhatsApp phone number info:', error);
      return null;
    }
  }

  /**
   * Check if WhatsApp is properly configured
   */
  isConfigured(): boolean {
    return !!(this.accessToken && this.phoneNumberId && this.verifyToken);
  }

  /**
   * Format phone number for WhatsApp (remove non-digits, ensure country code)
   */
  formatPhoneNumber(phoneNumber: string, defaultCountryCode: string = '1'): string {
    // Remove all non-digits
    const digits = phoneNumber.replace(/\D/g, '');

    // If it doesn't start with a country code, add default
    if (digits.length === 10) {
      return defaultCountryCode + digits;
    }

    return digits;
  }

  /**
   * Validate phone number format for WhatsApp
   */
  isValidPhoneNumber(phoneNumber: string): boolean {
    const digits = phoneNumber.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }
}

export const whatsappService = new WhatsAppService();
