import { logger } from '../utils/logger';
import { aiAssistantService, ConversationContext } from './aiAssistantService';

export interface IncomingMessage {
  messageId: string;
  senderId: string;
  recipientId?: string;
  text: string;
  timestamp: Date;
  channel: 'web' | 'whatsapp' | 'messenger' | 'instagram';
  metadata?: Record<string, unknown>;
}

export interface OutgoingMessage {
  recipientId: string;
  text: string;
  channel: 'web' | 'whatsapp' | 'messenger' | 'instagram';
  metadata?: Record<string, unknown>;
}

export interface MessageRouteResult {
  success: boolean;
  conversationId?: string;
  responseMessage?: string;
  error?: string;
}

class MessageRoutingService {
  /**
   * Route incoming message to AI assistant and handle response
   */
  async routeMessage(
    tenantId: string,
    message: IncomingMessage,
    customerId?: string
  ): Promise<MessageRouteResult> {
    try {
      logger.info(
        `Routing ${message.channel} message from ${message.senderId} to tenant ${tenantId}`
      );

      // Get or create conversation
      const conversation = await aiAssistantService.getOrCreateConversation(
        tenantId,
        message.channel,
        message.senderId,
        customerId
      );

      // Get conversation history for context
      const conversationHistory = await aiAssistantService.getConversationHistory(
        conversation._id.toString()
      );

      // Save incoming message
      await aiAssistantService.saveMessage(
        conversation._id.toString(),
        'user',
        message.text,
        message.metadata
      );

      // Build context for AI processing
      const context: ConversationContext = {
        tenantId,
        customerId,
        conversationHistory,
        channel: message.channel,
      };

      // Process message with AI assistant
      const aiResponse = await aiAssistantService.processMessage(message.text, context);

      // Save AI response
      await aiAssistantService.saveMessage(
        conversation._id.toString(),
        'assistant',
        aiResponse.message,
        aiResponse.metadata
      );

      // Send response back through appropriate channel
      const outgoingMessage: OutgoingMessage = {
        recipientId: message.senderId,
        text: aiResponse.message,
        channel: message.channel,
        metadata: aiResponse.metadata,
      };

      const sendSuccess = await this.sendMessage(outgoingMessage);

      return {
        success: sendSuccess,
        conversationId: conversation._id.toString(),
        responseMessage: aiResponse.message,
      };
    } catch (error) {
      logger.error('Error routing message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send message through appropriate channel
   */
  async sendMessage(message: OutgoingMessage): Promise<boolean> {
    try {
      switch (message.channel) {
        case 'whatsapp':
          return await this.sendWhatsAppMessage(message);
        case 'messenger':
          return await this.sendMessengerMessage(message);
        case 'instagram':
          return await this.sendInstagramMessage(message);
        case 'web':
          // Web messages are handled differently (real-time via WebSocket or polling)
          logger.info('Web message queued for delivery:', message);
          return true;
        default:
          logger.error(`Unsupported channel: ${message.channel}`);
          return false;
      }
    } catch (error) {
      logger.error(`Error sending ${message.channel} message:`, error);
      return false;
    }
  }

  /**
   * Send WhatsApp message
   */
  private async sendWhatsAppMessage(message: OutgoingMessage): Promise<boolean> {
    try {
      const { whatsappService } = await import('./whatsappService');
      return await whatsappService.sendTextMessage(message.recipientId, message.text);
    } catch (error) {
      logger.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  /**
   * Send Messenger message
   */
  private async sendMessengerMessage(message: OutgoingMessage): Promise<boolean> {
    try {
      const { messengerService } = await import('./messengerService');

      // Send typing indicator first
      await messengerService.sendTypingIndicator(message.recipientId, 'typing_on');

      // Send the message
      const success = await messengerService.sendTextMessage(message.recipientId, message.text);

      // Turn off typing indicator
      await messengerService.sendTypingIndicator(message.recipientId, 'typing_off');

      return success;
    } catch (error) {
      logger.error('Error sending Messenger message:', error);
      return false;
    }
  }

  /**
   * Send Instagram message
   */
  private async sendInstagramMessage(message: OutgoingMessage): Promise<boolean> {
    try {
      const { instagramService } = await import('./instagramService');

      // Send typing indicator first
      await instagramService.sendTypingIndicator(message.recipientId, 'typing_on');

      // Send the message
      const success = await instagramService.sendTextMessage(message.recipientId, message.text);

      // Turn off typing indicator
      await instagramService.sendTypingIndicator(message.recipientId, 'typing_off');

      return success;
    } catch (error) {
      logger.error('Error sending Instagram message:', error);
      return false;
    }
  }

  /**
   * Broadcast message to multiple channels
   */
  async broadcastMessage(
    _tenantId: string, // Reserved for future tenant-specific logic
    text: string,
    channels: Array<{
      channel: 'whatsapp' | 'messenger' | 'instagram';
      recipientId: string;
    }>
  ): Promise<{
    success: number;
    failed: number;
    results: Array<{ channel: string; recipientId: string; success: boolean }>;
  }> {
    const results: Array<{ channel: string; recipientId: string; success: boolean }> = [];
    let successCount = 0;
    let failedCount = 0;

    for (const target of channels) {
      const message: OutgoingMessage = {
        recipientId: target.recipientId,
        text,
        channel: target.channel,
      };

      const success = await this.sendMessage(message);

      results.push({
        channel: target.channel,
        recipientId: target.recipientId,
        success,
      });

      if (success) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    logger.info(`Broadcast completed: ${successCount} successful, ${failedCount} failed`);

    return {
      success: successCount,
      failed: failedCount,
      results,
    };
  }

  /**
   * Get conversation history across all channels for a customer
   */
  async getCustomerConversationHistory(
    tenantId: string,
    customerId: string,
    limit: number = 50
  ): Promise<
    Array<{
      conversationId: string;
      channel: string;
      messages: Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: Date;
      }>;
    }>
  > {
    try {
      const { AIConversation } = await import('../models/AIConversation');
      const { AIMessage } = await import('../models/AIMessage');

      // Find all conversations for this customer
      const conversations = await AIConversation.find({
        tenantId,
        customerId,
      }).sort({ updatedAt: -1 });

      const result = [];

      for (const conversation of conversations) {
        const messages = await AIMessage.find({
          conversationId: conversation._id,
        })
          .sort({ createdAt: -1 })
          .limit(limit);

        result.push({
          conversationId: conversation._id.toString(),
          channel: conversation.channel,
          messages: messages.map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: msg.createdAt,
          })),
        });
      }

      return result;
    } catch (error) {
      logger.error('Error getting customer conversation history:', error);
      return [];
    }
  }

  /**
   * Get active conversations across all channels
   */
  async getActiveConversations(
    tenantId: string,
    hoursBack: number = 24
  ): Promise<
    Array<{
      conversationId: string;
      channel: string;
      externalId: string;
      lastMessageAt: Date;
      messageCount: number;
    }>
  > {
    try {
      const { AIConversation } = await import('../models/AIConversation');
      const { AIMessage } = await import('../models/AIMessage');

      const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      // Find conversations with recent activity
      const conversations = await AIConversation.find({
        tenantId,
        updatedAt: { $gte: cutoffTime },
      }).sort({ updatedAt: -1 });

      const result = [];

      for (const conversation of conversations) {
        const messageCount = await AIMessage.countDocuments({
          conversationId: conversation._id,
          createdAt: { $gte: cutoffTime },
        });

        if (messageCount > 0) {
          const lastMessage = await AIMessage.findOne({
            conversationId: conversation._id,
          }).sort({ createdAt: -1 });

          result.push({
            conversationId: conversation._id.toString(),
            channel: conversation.channel,
            externalId: conversation.externalId || 'unknown',
            lastMessageAt: lastMessage?.createdAt || conversation.updatedAt,
            messageCount,
          });
        }
      }

      return result;
    } catch (error) {
      logger.error('Error getting active conversations:', error);
      return [];
    }
  }

  /**
   * Get conversation statistics for a tenant
   */
  async getConversationStats(
    tenantId: string,
    days: number = 7
  ): Promise<{
    totalConversations: number;
    messagesByChannel: Record<string, number>;
    averageResponseTime: number;
    activeConversations: number;
  }> {
    try {
      const { AIConversation } = await import('../models/AIConversation');
      const { AIMessage } = await import('../models/AIMessage');

      const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Total conversations
      const totalConversations = await AIConversation.countDocuments({
        tenantId,
        createdAt: { $gte: cutoffTime },
      });

      // Messages by channel
      const messagesByChannel: Record<string, number> = {};
      const conversations = await AIConversation.find({
        tenantId,
        createdAt: { $gte: cutoffTime },
      });

      for (const conversation of conversations) {
        const messageCount = await AIMessage.countDocuments({
          conversationId: conversation._id,
          createdAt: { $gte: cutoffTime },
        });

        messagesByChannel[conversation.channel] =
          (messagesByChannel[conversation.channel] || 0) + messageCount;
      }

      // Active conversations (with messages in last 24 hours)
      const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeConversations = await AIConversation.countDocuments({
        tenantId,
        updatedAt: { $gte: recentCutoff },
      });

      // Average response time (simplified calculation)
      // In a real implementation, you'd track response times more precisely
      const averageResponseTime = 30; // seconds (placeholder)

      return {
        totalConversations,
        messagesByChannel,
        averageResponseTime,
        activeConversations,
      };
    } catch (error) {
      logger.error('Error getting conversation stats:', error);
      return {
        totalConversations: 0,
        messagesByChannel: {},
        averageResponseTime: 0,
        activeConversations: 0,
      };
    }
  }

  /**
   * Handle message delivery status updates
   */
  async handleDeliveryStatus(
    channel: string,
    messageId: string,
    status: 'sent' | 'delivered' | 'read' | 'failed',
    timestamp: Date
  ): Promise<void> {
    try {
      logger.info(`Message ${messageId} on ${channel}: ${status} at ${timestamp}`);

      // In a full implementation, you'd update message status in database
      // This could be used for analytics and delivery tracking

      // For now, just log the status update
    } catch (error) {
      logger.error('Error handling delivery status:', error);
    }
  }

  /**
   * Clean up old conversations and messages
   */
  async cleanupOldData(
    daysToKeep: number = 90
  ): Promise<{ deletedConversations: number; deletedMessages: number }> {
    try {
      const { AIConversation } = await import('../models/AIConversation');
      const { AIMessage } = await import('../models/AIMessage');

      const cutoffTime = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      // Find old conversations
      const oldConversations = await AIConversation.find({
        updatedAt: { $lt: cutoffTime },
      });

      let deletedMessages = 0;
      let deletedConversations = 0;

      for (const conversation of oldConversations) {
        // Delete messages for this conversation
        const messageDeleteResult = await AIMessage.deleteMany({
          conversationId: conversation._id,
        });
        deletedMessages += messageDeleteResult.deletedCount || 0;

        // Delete the conversation
        await AIConversation.deleteOne({ _id: conversation._id });
        deletedConversations++;
      }

      logger.info(
        `Cleanup completed: ${deletedConversations} conversations and ${deletedMessages} messages deleted`
      );

      return { deletedConversations, deletedMessages };
    } catch (error) {
      logger.error('Error cleaning up old data:', error);
      return { deletedConversations: 0, deletedMessages: 0 };
    }
  }
}

export const messageRoutingService = new MessageRoutingService();
