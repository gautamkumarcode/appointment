import crypto from 'crypto';
import { logger } from '../utils/logger';

export interface MessengerMessage {
  mid: string;
  text?: string;
  attachments?: Array<{
    type: string;
    payload: {
      url?: string;
      sticker_id?: number;
    };
  }>;
}

export interface MessengerMessaging {
  sender: {
    id: string;
  };
  recipient: {
    id: string;
  };
  timestamp: number;
  message?: MessengerMessage;
  delivery?: {
    mids: string[];
    watermark: number;
  };
  read?: {
    watermark: number;
  };
  postback?: {
    title: string;
    payload: string;
    mid?: string;
  };
}

export interface MessengerWebhookEntry {
  id: string;
  time: number;
  messaging: MessengerMessaging[];
}

export interface MessengerWebhookPayload {
  object: string;
  entry: MessengerWebhookEntry[];
}

class MessengerService {
  private readonly accessToken: string;
  private readonly verifyToken: string;
  private readonly appSecret: string;
  private readonly apiVersion: string = 'v18.0';
  private readonly baseUrl: string;

  constructor() {
    this.accessToken = process.env.MESSENGER_ACCESS_TOKEN || '';
    this.verifyToken = process.env.MESSENGER_VERIFY_TOKEN || '';
    this.appSecret = process.env.MESSENGER_APP_SECRET || '';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;

    if (!this.accessToken || !this.verifyToken) {
      logger.warn('Messenger credentials not configured. Messenger features will be disabled.');
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.appSecret) {
      logger.warn('Messenger app secret not configured');
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha1', this.appSecret)
        .update(payload)
        .digest('hex');

      const receivedSignature = signature.replace('sha1=', '');

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
      );
    } catch (error) {
      logger.error('Error verifying Messenger webhook signature:', error);
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
   * Send a text message via Messenger
   */
  async sendTextMessage(recipientId: string, message: string): Promise<boolean> {
    if (!this.accessToken) {
      logger.error('Messenger not configured');
      return false;
    }

    try {
      const url = `${this.baseUrl}/me/messages`;

      const payload = {
        recipient: {
          id: recipientId,
        },
        message: {
          text: message,
        },
        messaging_type: 'RESPONSE',
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
        logger.error('Messenger API error:', errorData);
        return false;
      }

      const result = await response.json();
      logger.info('Messenger message sent successfully:', result);
      return true;
    } catch (error) {
      logger.error('Error sending Messenger message:', error);
      return false;
    }
  }

  /**
   * Send a message with quick replies
   */
  async sendQuickReplies(
    recipientId: string,
    text: string,
    quickReplies: Array<{ title: string; payload: string }>
  ): Promise<boolean> {
    if (!this.accessToken) {
      logger.error('Messenger not configured');
      return false;
    }

    try {
      const url = `${this.baseUrl}/me/messages`;

      const payload = {
        recipient: {
          id: recipientId,
        },
        message: {
          text,
          quick_replies: quickReplies.map((reply) => ({
            content_type: 'text',
            title: reply.title,
            payload: reply.payload,
          })),
        },
        messaging_type: 'RESPONSE',
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
        logger.error('Messenger quick replies API error:', errorData);
        return false;
      }

      const result = await response.json();
      logger.info('Messenger quick replies sent successfully:', result);
      return true;
    } catch (error) {
      logger.error('Error sending Messenger quick replies:', error);
      return false;
    }
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(
    recipientId: string,
    action: 'typing_on' | 'typing_off' = 'typing_on'
  ): Promise<boolean> {
    if (!this.accessToken) {
      return false;
    }

    try {
      const url = `${this.baseUrl}/me/messages`;

      const payload = {
        recipient: {
          id: recipientId,
        },
        sender_action: action,
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
      logger.error('Error sending Messenger typing indicator:', error);
      return false;
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(
    userId: string
  ): Promise<{ first_name?: string; last_name?: string; profile_pic?: string } | null> {
    if (!this.accessToken) {
      return null;
    }

    try {
      const url = `${this.baseUrl}/${userId}?fields=first_name,last_name,profile_pic&access_token=${this.accessToken}`;

      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as {
        first_name?: string;
        last_name?: string;
        profile_pic?: string;
      };
    } catch (error) {
      logger.error('Error getting Messenger user profile:', error);
      return null;
    }
  }

  /**
   * Parse incoming webhook payload
   */
  parseWebhookPayload(payload: MessengerWebhookPayload): {
    messages: Array<{
      messageId: string;
      senderId: string;
      recipientId: string;
      text: string;
      timestamp: Date;
    }>;
    deliveries: Array<{
      senderId: string;
      messageIds: string[];
      timestamp: Date;
    }>;
    reads: Array<{
      senderId: string;
      timestamp: Date;
    }>;
    postbacks: Array<{
      senderId: string;
      title: string;
      payload: string;
      timestamp: Date;
    }>;
  } {
    const messages: Array<{
      messageId: string;
      senderId: string;
      recipientId: string;
      text: string;
      timestamp: Date;
    }> = [];

    const deliveries: Array<{
      senderId: string;
      messageIds: string[];
      timestamp: Date;
    }> = [];

    const reads: Array<{
      senderId: string;
      timestamp: Date;
    }> = [];

    const postbacks: Array<{
      senderId: string;
      title: string;
      payload: string;
      timestamp: Date;
    }> = [];

    if (payload.object !== 'page') {
      return { messages, deliveries, reads, postbacks };
    }

    for (const entry of payload.entry) {
      for (const messaging of entry.messaging) {
        const timestamp = new Date(messaging.timestamp);

        // Process text messages
        if (messaging.message?.text) {
          messages.push({
            messageId: messaging.message.mid,
            senderId: messaging.sender.id,
            recipientId: messaging.recipient.id,
            text: messaging.message.text,
            timestamp,
          });
        }

        // Process delivery confirmations
        if (messaging.delivery) {
          deliveries.push({
            senderId: messaging.sender.id,
            messageIds: messaging.delivery.mids,
            timestamp,
          });
        }

        // Process read confirmations
        if (messaging.read) {
          reads.push({
            senderId: messaging.sender.id,
            timestamp,
          });
        }

        // Process postbacks (button clicks)
        if (messaging.postback) {
          postbacks.push({
            senderId: messaging.sender.id,
            title: messaging.postback.title,
            payload: messaging.postback.payload,
            timestamp,
          });
        }
      }
    }

    return { messages, deliveries, reads, postbacks };
  }

  /**
   * Set up persistent menu
   */
  async setPersistentMenu(
    menuItems: Array<{
      type: 'postback' | 'web_url';
      title: string;
      payload?: string;
      url?: string;
    }>
  ): Promise<boolean> {
    if (!this.accessToken) {
      return false;
    }

    try {
      const url = `${this.baseUrl}/me/messenger_profile`;

      const payload = {
        persistent_menu: [
          {
            locale: 'default',
            composer_input_disabled: false,
            call_to_actions: menuItems,
          },
        ],
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
      logger.error('Error setting Messenger persistent menu:', error);
      return false;
    }
  }

  /**
   * Set greeting text
   */
  async setGreeting(greetingText: string): Promise<boolean> {
    if (!this.accessToken) {
      return false;
    }

    try {
      const url = `${this.baseUrl}/me/messenger_profile`;

      const payload = {
        greeting: [
          {
            locale: 'default',
            text: greetingText,
          },
        ],
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
      logger.error('Error setting Messenger greeting:', error);
      return false;
    }
  }

  /**
   * Check if Messenger is properly configured
   */
  isConfigured(): boolean {
    return !!(this.accessToken && this.verifyToken && this.appSecret);
  }
}

export const messengerService = new MessengerService();
