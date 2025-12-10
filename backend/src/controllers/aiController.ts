import { Request, Response } from 'express';
import { z } from 'zod';
import { aiAssistantService } from '../services/aiAssistantService';
import { logger } from '../utils/logger';

// Validation schemas
const chatMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  conversationId: z.string().optional(),
  channel: z.enum(['web', 'whatsapp', 'messenger', 'instagram']).default('web'),
  externalId: z.string().optional(),
  customerId: z.string().optional(),
  timezone: z.string().default('UTC'),
});

// Webhook message schema for future use
// const webhookMessageSchema = z.object({
//   from: z.string(),
//   message: z.string(),
//   timestamp: z.number().optional(),
// });

/**
 * Handle chat messages from web widget or API
 */
export const handleChatMessage = async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID is required',
      });
    }

    const validatedData = chatMessageSchema.parse(req.body);
    const { message, channel, externalId, customerId } = validatedData;

    // Get or create conversation
    const conversation = await aiAssistantService.getOrCreateConversation(
      tenantId,
      channel,
      externalId,
      customerId
    );

    // Get conversation history
    const conversationHistory = await aiAssistantService.getConversationHistory(
      conversation._id.toString()
    );

    // Save user message
    await aiAssistantService.saveMessage(conversation._id.toString(), 'user', message);

    // Process message and get AI response
    const context = {
      tenantId,
      customerId,
      conversationHistory,
      channel,
    };

    const aiResponse = await aiAssistantService.processMessage(message, context);

    // Save AI response
    await aiAssistantService.saveMessage(
      conversation._id.toString(),
      'assistant',
      aiResponse.message,
      aiResponse.metadata
    );

    res.json({
      success: true,
      data: {
        message: aiResponse.message,
        intent: aiResponse.intent,
        requiresFollowUp: aiResponse.requiresFollowUp,
        conversationId: conversation._id.toString(),
      },
    });
    return;
  } catch (error) {
    logger.error('Error handling chat message:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
    return;
  }
};

/**
 * Handle WhatsApp webhook messages
 */
export const handleWhatsAppWebhook = async (req: Request, res: Response) => {
  try {
    // WhatsApp webhook verification
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      const { whatsappService } = await import('../services/whatsappService');

      if (mode === 'subscribe' && whatsappService.verifyWebhookToken(token as string)) {
        logger.info('WhatsApp webhook verified successfully');
        return res.status(200).send(challenge);
      }

      logger.warn('WhatsApp webhook verification failed');
      return res.status(403).send('Forbidden');
    }

    // Verify webhook signature for security
    const { whatsappService } = await import('../services/whatsappService');
    const signature = req.headers['x-hub-signature-256'] as string;
    const payload = JSON.stringify(req.body);

    if (signature && !whatsappService.verifyWebhookSignature(payload, signature)) {
      logger.warn('WhatsApp webhook signature verification failed');
      return res.status(403).send('Forbidden');
    }

    // Parse webhook payload
    const parsedData = whatsappService.parseWebhookPayload(req.body);

    // Process incoming messages
    for (const message of parsedData.messages) {
      try {
        await processWhatsAppMessage(message);

        // Mark message as read
        await whatsappService.markMessageAsRead(message.messageId);
      } catch (error) {
        logger.error('Error processing WhatsApp message:', error);
      }
    }

    // Process message statuses (delivered, read, etc.)
    for (const status of parsedData.statuses) {
      logger.info('WhatsApp message status update:', status);
      // Could be used to update message delivery status in database
    }

    res.status(200).send('OK');
    return;
  } catch (error) {
    logger.error('Error handling WhatsApp webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
    return;
  }
};

/**
 * Handle Facebook Messenger webhook messages
 */
export const handleMessengerWebhook = async (req: Request, res: Response) => {
  try {
    // Messenger webhook verification
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      const { messengerService } = await import('../services/messengerService');

      if (mode === 'subscribe' && messengerService.verifyWebhookToken(token as string)) {
        logger.info('Messenger webhook verified successfully');
        return res.status(200).send(challenge);
      }

      logger.warn('Messenger webhook verification failed');
      return res.status(403).send('Forbidden');
    }

    // Verify webhook signature for security
    const { messengerService } = await import('../services/messengerService');
    const signature = req.headers['x-hub-signature'] as string;
    const payload = JSON.stringify(req.body);

    if (signature && !messengerService.verifyWebhookSignature(payload, signature)) {
      logger.warn('Messenger webhook signature verification failed');
      return res.status(403).send('Forbidden');
    }

    // Parse webhook payload
    const parsedData = messengerService.parseWebhookPayload(req.body);

    // Process incoming messages
    for (const message of parsedData.messages) {
      try {
        await processMessengerMessage(message);
      } catch (error) {
        logger.error('Error processing Messenger message:', error);
      }
    }

    // Process postbacks (button clicks)
    for (const postback of parsedData.postbacks) {
      try {
        await processMessengerPostback(postback);
      } catch (error) {
        logger.error('Error processing Messenger postback:', error);
      }
    }

    // Log delivery and read confirmations
    for (const delivery of parsedData.deliveries) {
      logger.info('Messenger message delivered:', delivery);
    }

    for (const read of parsedData.reads) {
      logger.info('Messenger message read:', read);
    }

    res.status(200).send('OK');
    return;
  } catch (error) {
    logger.error('Error handling Messenger webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
    return;
  }
};

/**
 * Handle Instagram webhook messages
 */
export const handleInstagramWebhook = async (req: Request, res: Response) => {
  try {
    // Instagram webhook verification
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      const { instagramService } = await import('../services/instagramService');

      if (mode === 'subscribe' && instagramService.verifyWebhookToken(token as string)) {
        logger.info('Instagram webhook verified successfully');
        return res.status(200).send(challenge);
      }

      logger.warn('Instagram webhook verification failed');
      return res.status(403).send('Forbidden');
    }

    // Verify webhook signature for security
    const { instagramService } = await import('../services/instagramService');
    const signature = req.headers['x-hub-signature'] as string;
    const payload = JSON.stringify(req.body);

    if (signature && !instagramService.verifyWebhookSignature(payload, signature)) {
      logger.warn('Instagram webhook signature verification failed');
      return res.status(403).send('Forbidden');
    }

    // Parse webhook payload
    const parsedData = instagramService.parseWebhookPayload(req.body);

    // Process incoming messages
    for (const message of parsedData.messages) {
      try {
        await processInstagramMessage(message);
      } catch (error) {
        logger.error('Error processing Instagram message:', error);
      }
    }

    // Process postbacks (button clicks)
    for (const postback of parsedData.postbacks) {
      try {
        await processInstagramPostback(postback);
      } catch (error) {
        logger.error('Error processing Instagram postback:', error);
      }
    }

    // Log delivery and read confirmations
    for (const delivery of parsedData.deliveries) {
      logger.info('Instagram message delivered:', delivery);
    }

    for (const read of parsedData.reads) {
      logger.info('Instagram message read:', read);
    }

    res.status(200).send('OK');
    return;
  } catch (error) {
    logger.error('Error handling Instagram webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
    return;
  }
};

/**
 * Handle public chat messages (no auth required for embeddable widget)
 */
export const handlePublicChatMessage = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID is required in X-Tenant-ID header',
      });
    }

    const validatedData = chatMessageSchema.parse(req.body);
    const { message, channel, externalId, customerId } = validatedData;

    // Get or create conversation
    const conversation = await aiAssistantService.getOrCreateConversation(
      tenantId,
      channel,
      externalId,
      customerId
    );

    // Get conversation history
    const conversationHistory = await aiAssistantService.getConversationHistory(
      conversation._id.toString()
    );

    // Save user message
    await aiAssistantService.saveMessage(conversation._id.toString(), 'user', message);

    // Process message and get AI response
    const context = {
      tenantId,
      customerId,
      conversationHistory,
      channel,
    };

    const aiResponse = await aiAssistantService.processMessage(message, context);

    // Save AI response
    await aiAssistantService.saveMessage(
      conversation._id.toString(),
      'assistant',
      aiResponse.message,
      aiResponse.metadata
    );

    res.json({
      success: true,
      data: {
        message: aiResponse.message,
        intent: aiResponse.intent,
        requiresFollowUp: aiResponse.requiresFollowUp,
        conversationId: conversation._id.toString(),
      },
    });
    return;
  } catch (error) {
    logger.error('Error handling public chat message:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
    return;
  }
};

/**
 * Get chat widget configuration
 */
export const getChatWidgetConfig = async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || (req.headers['x-tenant-id'] as string);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID is required',
      });
    }

    // Return basic widget configuration
    res.json({
      success: true,
      data: {
        tenantId,
        welcomeMessage: "Hi! I'm here to help you book an appointment. How can I assist you today?",
        placeholder: 'Type your message...',
        theme: {
          primaryColor: '#007bff',
          textColor: '#333333',
        },
      },
    });
    return;
  } catch (error) {
    logger.error('Error getting chat widget config:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
    return;
  }
};

// Helper functions for processing messages from different channels

async function processWhatsAppMessage(message: {
  messageId: string;
  from: string;
  text: string;
  timestamp: Date;
  phoneNumberId: string;
}) {
  try {
    // Resolve tenant from phone number ID
    const tenantId = await resolveTenantFromPhoneNumber(message.phoneNumberId);

    if (!tenantId) {
      logger.warn(`No tenant found for WhatsApp phone number ID: ${message.phoneNumberId}`);
      return;
    }

    // Use message routing service
    const { messageRoutingService } = await import('../services/messageRoutingService');

    const incomingMessage = {
      messageId: message.messageId,
      senderId: message.from,
      text: message.text,
      timestamp: message.timestamp,
      channel: 'whatsapp' as const,
      metadata: { phoneNumberId: message.phoneNumberId },
    };

    const result = await messageRoutingService.routeMessage(tenantId, incomingMessage);

    if (!result.success) {
      logger.error('Failed to route WhatsApp message:', result.error);
    } else {
      logger.info('WhatsApp message routed successfully');
    }
  } catch (error) {
    logger.error('Error processing WhatsApp message:', error);
  }
}

/**
 * Resolve tenant ID from WhatsApp phone number ID
 * In a real implementation, this would query a database mapping
 */
async function resolveTenantFromPhoneNumber(phoneNumberId: string): Promise<string | null> {
  try {
    const { whatsappConfigService } = await import('../services/whatsappConfigService');
    return await whatsappConfigService.findTenantByPhoneNumberId(phoneNumberId);
  } catch (error) {
    logger.error('Error resolving tenant from phone number:', error);
    return null;
  }
}

async function resolveTenantFromMessengerPageId(pageId: string): Promise<string | null> {
  try {
    const { messengerConfigService } = await import('../services/messengerConfigService');
    return await messengerConfigService.findTenantByPageId(pageId);
  } catch (error) {
    logger.error('Error resolving tenant from Messenger page ID:', error);
    return null;
  }
}

async function resolveTenantFromInstagramAccountId(
  instagramAccountId: string
): Promise<string | null> {
  try {
    const { instagramConfigService } = await import('../services/instagramConfigService');
    return await instagramConfigService.findTenantByInstagramAccountId(instagramAccountId);
  } catch (error) {
    logger.error('Error resolving tenant from Instagram account ID:', error);
    return null;
  }
}

async function processMessengerMessage(message: {
  messageId: string;
  senderId: string;
  recipientId: string;
  text: string;
  timestamp: Date;
}) {
  try {
    // Resolve tenant from page ID (recipient ID)
    const tenantId = await resolveTenantFromMessengerPageId(message.recipientId);

    if (!tenantId) {
      logger.warn(`No tenant found for Messenger page ID: ${message.recipientId}`);
      return;
    }

    // Use message routing service
    const { messageRoutingService } = await import('../services/messageRoutingService');

    const incomingMessage = {
      messageId: message.messageId,
      senderId: message.senderId,
      recipientId: message.recipientId,
      text: message.text,
      timestamp: message.timestamp,
      channel: 'messenger' as const,
      metadata: { pageId: message.recipientId },
    };

    const result = await messageRoutingService.routeMessage(tenantId, incomingMessage);

    if (!result.success) {
      logger.error('Failed to route Messenger message:', result.error);
    } else {
      logger.info('Messenger message routed successfully');
    }
  } catch (error) {
    logger.error('Error processing Messenger message:', error);
  }
}

async function processMessengerPostback(postback: {
  senderId: string;
  title: string;
  payload: string;
  timestamp: Date;
}) {
  try {
    logger.info('Processing Messenger postback:', postback);

    // Handle postback as a regular message with the payload as text
    // This allows the AI to process button clicks as user input
    const message = {
      messageId: `postback_${Date.now()}`,
      senderId: postback.senderId,
      recipientId: '', // We'll need to resolve this
      text: postback.payload,
      timestamp: postback.timestamp,
    };

    // For now, we'll process it as a regular message
    // In a full implementation, you might want special handling for postbacks
    await processMessengerMessage(message);
  } catch (error) {
    logger.error('Error processing Messenger postback:', error);
  }
}

async function processInstagramMessage(message: {
  messageId: string;
  senderId: string;
  recipientId: string;
  text: string;
  timestamp: Date;
}) {
  try {
    // Resolve tenant from Instagram account ID (recipient ID)
    const tenantId = await resolveTenantFromInstagramAccountId(message.recipientId);

    if (!tenantId) {
      logger.warn(`No tenant found for Instagram account ID: ${message.recipientId}`);
      return;
    }

    // Use message routing service
    const { messageRoutingService } = await import('../services/messageRoutingService');

    const incomingMessage = {
      messageId: message.messageId,
      senderId: message.senderId,
      recipientId: message.recipientId,
      text: message.text,
      timestamp: message.timestamp,
      channel: 'instagram' as const,
      metadata: { instagramAccountId: message.recipientId },
    };

    const result = await messageRoutingService.routeMessage(tenantId, incomingMessage);

    if (!result.success) {
      logger.error('Failed to route Instagram message:', result.error);
    } else {
      logger.info('Instagram message routed successfully');
    }
  } catch (error) {
    logger.error('Error processing Instagram message:', error);
  }
}

async function processInstagramPostback(postback: {
  senderId: string;
  title: string;
  payload: string;
  timestamp: Date;
}) {
  try {
    logger.info('Processing Instagram postback:', postback);

    // Handle postback as a regular message with the payload as text
    // This allows the AI to process button clicks as user input
    const message = {
      messageId: `postback_${Date.now()}`,
      senderId: postback.senderId,
      recipientId: '', // We'll need to resolve this
      text: postback.payload,
      timestamp: postback.timestamp,
    };

    // For now, we'll process it as a regular message
    // In a full implementation, you might want special handling for postbacks
    await processInstagramMessage(message);
  } catch (error) {
    logger.error('Error processing Instagram postback:', error);
  }
}
