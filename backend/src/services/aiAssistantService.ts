import mongoose from 'mongoose';
import { OpenAI } from 'openai';
import { AIConversation, IAIConversation } from '../models/AIConversation';
import { AIMessage, IAIMessage } from '../models/AIMessage';
import { Tenant } from '../models/Tenant';
import { logger } from '../utils/logger';
import { appointmentService } from './appointmentService';
import availabilityService from './availabilityService';
import { serviceService } from './serviceService';

export interface ConversationContext {
  tenantId: string;
  customerId?: string;
  conversationHistory: IAIMessage[];
  channel: 'web' | 'whatsapp' | 'messenger' | 'instagram';
}

export interface AIResponse {
  message: string;
  intent?: string;
  requiresFollowUp?: boolean;
  metadata?: Record<string, unknown>;
}

export interface BookingIntent {
  type: 'booking';
  serviceId?: string;
  staffId?: string;
  preferredDate?: string;
  preferredTime?: string;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface ServiceInfo {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  currency: string;
}

export interface AvailabilityQuery {
  serviceId?: string;
  staffId?: string;
  date?: string;
  timezone?: string;
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  staffId?: string;
  staffName?: string;
}

export interface AIBookingData {
  serviceId: string;
  staffId?: string;
  startTime: Date;
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
  };
  paymentOption: 'prepaid' | 'pay_at_venue';
  notes?: string;
  timezone: string;
}

class AIAssistantService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.warn('OPENAI_API_KEY not provided. AI features will be limited.');
      // Create a mock OpenAI instance for development
      this.openai = null as any;
    } else {
      this.openai = new OpenAI({
        apiKey,
      });
    }
  }

  /**
   * Get or create conversation for a channel and external ID
   */
  async getOrCreateConversation(
    tenantId: string,
    channel: 'web' | 'whatsapp' | 'messenger' | 'instagram',
    externalId?: string,
    customerId?: string
  ): Promise<IAIConversation> {
    let conversation: IAIConversation | null = null;

    // Generate unique externalId if not provided to avoid duplicate key errors
    if (!externalId) {
      externalId = `${channel}-${tenantId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Try to find existing conversation
    conversation = await AIConversation.findOne({
      channel,
      externalId,
    });

    if (!conversation) {
      conversation = new AIConversation({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        customerId: customerId ? new mongoose.Types.ObjectId(customerId) : undefined,
        channel,
        externalId,
      });
      await conversation.save();
    }

    return conversation;
  }

  /**
   * Get conversation history for context
   */
  async getConversationHistory(conversationId: string): Promise<IAIMessage[]> {
    return await AIMessage.find({
      conversationId: new mongoose.Types.ObjectId(conversationId),
    })
      .sort({ createdAt: 1 })
      .limit(20); // Keep last 20 messages for context
  }

  /**
   * Save message to conversation
   */
  async saveMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<IAIMessage> {
    const message = new AIMessage({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      role,
      content,
      metadata,
    });
    await message.save();
    return message;
  }

  /**
   * Generate system prompt for the booking assistant
   */
  private generateSystemPrompt(tenant: any, services: ServiceInfo[]): string {
    const servicesList = services
      .map(
        (s) =>
          `- ${s.name}: ${s.durationMinutes} minutes, ${s.price} ${s.currency}${
            s.description ? ` - ${s.description}` : ''
          }`
      )
      .join('\n');

    return `You are a helpful booking assistant for ${tenant.businessName}. Your role is to help customers:

1. Learn about our services and pricing
2. Check availability for appointments
3. Book appointments by collecting required information
4. Answer questions about business hours and policies

SERVICES AVAILABLE:
${servicesList}

BUSINESS INFORMATION:
- Business Name: ${tenant.businessName}
- Timezone: ${tenant.timezone}
- Currency: ${tenant.currency}

INSTRUCTIONS:
- Be friendly, professional, and helpful
- Always confirm details before booking
- If you need to check availability or book appointments, use the appropriate functions
- For unclear requests, ask clarifying questions
- Always include service details when discussing pricing
- When booking, collect: name, email, phone (optional), preferred service, and date/time
- Inform customers about payment options: prepaid or pay at venue

Keep responses concise but informative. Always prioritize customer satisfaction.`;
  }

  /**
   * Process a message and generate AI response
   */
  async processMessage(message: string, context: ConversationContext): Promise<AIResponse> {
    try {
      // Extract intent first
      const intent = this.extractIntent(message);

      // Handle specific intents with dedicated methods
      if (intent === 'service_info') {
        const response = await this.handleServiceInquiry(context.tenantId, message);
        return {
          message: response,
          intent,
          requiresFollowUp: false,
          metadata: { handledDirectly: true },
        };
      }

      if (intent === 'business_hours') {
        const response = await this.getBusinessHours(context.tenantId);
        return {
          message: response,
          intent,
          requiresFollowUp: false,
          metadata: { handledDirectly: true },
        };
      }

      if (intent === 'availability') {
        // Extract timezone from context or use UTC as default
        const timezone = 'UTC'; // This could be extracted from customer data
        const response = await this.handleAvailabilityInquiry(context.tenantId, message, timezone);
        return {
          message: response,
          intent,
          requiresFollowUp: true,
          metadata: { handledDirectly: true },
        };
      }

      const isBookingFlow = this.isInBookingFlow(context.conversationHistory);
      logger.info('Intent routing check:', { 
        intent, 
        isBookingFlow, 
        message: message.substring(0, 100),
        recentMessages: context.conversationHistory.slice(-3).map(m => ({ role: m.role, content: m.content.substring(0, 50) }))
      });

      if (intent === 'booking' || isBookingFlow) {
        logger.info('Routing to booking flow', { intent, isBookingFlow, message: message.substring(0, 50) });
        const response = await this.handleBookingFlow(
          context.tenantId,
          message,
          context.conversationHistory
        );
        return {
          message: response,
          intent: 'booking',
          requiresFollowUp: true,
          metadata: { handledDirectly: true },
        };
      }

      if (intent === 'general') {
        const response = this.handleUnclearIntent();
        return {
          message: response,
          intent,
          requiresFollowUp: true,
          metadata: { handledDirectly: true },
        };
      }

      // For complex intents (booking, availability), use OpenAI
      const tenant = await Tenant.findById(context.tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Get tenant services for context
      const serviceInfo = await this.getServiceInfo(context.tenantId);

      // Build conversation history for context
      const messages = [
        {
          role: 'system' as const,
          content: this.generateSystemPrompt(tenant, serviceInfo),
        },
        ...context.conversationHistory.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        {
          role: 'user' as const,
          content: message,
        },
      ];

      // Call OpenAI API for complex interactions
      if (!this.openai) {
        return {
          message: 'AI features are not available. Please configure OPENAI_API_KEY.',
          intent,
          requiresFollowUp: false,
          metadata: { error: 'No API key' },
        };
      }

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      const responseMessage =
        completion.choices[0]?.message?.content ||
        "I'm sorry, I couldn't process your request. Please try again.";

      return {
        message: responseMessage,
        intent,
        requiresFollowUp: intent === 'booking' || intent === 'availability',
        metadata: {
          model: 'gpt-4',
          tokens: completion.usage?.total_tokens,
        },
      };
    } catch (error) {
      logger.error('Error processing AI message:', error);
      return {
        message: "I'm experiencing some technical difficulties. Please try again in a moment.",
        metadata: { error: true },
      };
    }
  }

  /**
   * Extract service inquiry intent and retrieve service information
   */
  async getServiceInfo(tenantId: string, query?: string): Promise<ServiceInfo[]> {
    try {
      const services = await serviceService.listServices(tenantId);

      const serviceInfo: ServiceInfo[] = services
        .filter((s) => s.isActive && !s.deletedAt) // Only active, non-deleted services
        .map((s) => ({
          id: s._id.toString(),
          name: s.name,
          description: s.description,
          durationMinutes: s.durationMinutes,
          price: s.price,
          currency: s.currency,
        }));

      // If query is provided, filter services by name or description
      if (query) {
        const lowerQuery = query.toLowerCase();
        return serviceInfo.filter(
          (service) =>
            service.name.toLowerCase().includes(lowerQuery) ||
            (service.description && service.description.toLowerCase().includes(lowerQuery))
        );
      }

      return serviceInfo;
    } catch (error) {
      logger.error('Error retrieving service info:', error);
      return [];
    }
  }

  /**
   * Get business hours information
   */
  async getBusinessHours(tenantId: string): Promise<string> {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return 'Business hours information is not available.';
      }

      // For now, return a default message. In a full implementation,
      // business hours would be stored in tenant settings
      const settings = tenant.settings as any;
      if (settings?.businessHours) {
        return this.formatBusinessHours(settings.businessHours);
      }

      return `We're open Monday through Friday, 9 AM to 5 PM (${tenant.timezone}). Please contact us for specific availability.`;
    } catch (error) {
      logger.error('Error retrieving business hours:', error);
      return "I'm unable to retrieve business hours at the moment. Please contact us directly.";
    }
  }

  /**
   * Get staff information for filtering
   */
  async getStaffInfo(tenantId: string): Promise<{ id: string; name: string }[]> {
    try {
      const { staffService } = await import('./staffService');
      const staffMembers = await staffService.listStaff(tenantId);

      return staffMembers.map((staff) => ({
        id: staff._id.toString(),
        name: staff.name,
      }));
    } catch (error) {
      logger.error('Error retrieving staff info:', error);
      return [];
    }
  }

  /**
   * Build availability response header with context
   */
  private buildAvailabilityResponseHeader(
    targetDate?: string,
    serviceName?: string,
    staffName?: string
  ): string {
    let response = 'Here are the available time slots';

    if (serviceName) {
      response += ` for ${serviceName}`;
    }

    if (staffName) {
      response += ` with ${staffName}`;
    }

    if (targetDate) {
      if (targetDate === 'today') {
        response += ' today';
      } else if (targetDate === 'tomorrow') {
        response += ' tomorrow';
      } else {
        response += ` on ${targetDate}`;
      }
    } else {
      response += ' in the next few days';
    }

    response += ':\n\n';
    return response;
  }

  /**
   * Format business hours for display
   */
  private formatBusinessHours(_businessHours: any): string {
    // This would format structured business hours data
    // For now, return a simple format
    return "We're open Monday through Friday, 9 AM to 5 PM. Weekend hours may vary.";
  }

  /**
   * Handle service inquiry messages
   */
  async handleServiceInquiry(tenantId: string, message: string): Promise<string> {
    try {
      const lowerMessage = message.toLowerCase();

      // Check if asking about specific service
      let query: string | undefined;
      if (lowerMessage.includes('about') || lowerMessage.includes('tell me')) {
        // Extract service name from message
        const services = await this.getServiceInfo(tenantId);
        for (const service of services) {
          if (lowerMessage.includes(service.name.toLowerCase())) {
            query = service.name;
            break;
          }
        }
      }

      const services = await this.getServiceInfo(tenantId, query);

      if (services.length === 0) {
        return "I'm sorry, we don't currently have any services available that match your inquiry. Please contact us directly for more information.";
      }

      if (query && services.length === 1) {
        // Specific service inquiry
        const service = services[0];
        return `${service.name} is ${service.durationMinutes} minutes long and costs ${service.price} ${service.currency}.${
          service.description ? ` ${service.description}` : ''
        } Would you like to check availability or book this service?`;
      }

      // General service list
      let response = 'Here are our available services:\n\n';
      services.forEach((service) => {
        response += `• ${service.name} - ${service.durationMinutes} minutes, ${service.price} ${service.currency}\n`;
        if (service.description) {
          response += `  ${service.description}\n`;
        }
      });

      response += '\nWould you like to know more about any specific service or check availability?';
      return response;
    } catch (error) {
      logger.error('Error handling service inquiry:', error);
      return "I'm having trouble retrieving our service information. Please try again or contact us directly.";
    }
  }

  /**
   * Handle unclear intents with fallback messages
   */
  handleUnclearIntent(): string {
    const fallbackMessages = [
      'I can help you with:\n• Information about our services and pricing\n• Checking availability for appointments\n• Booking appointments\n• Business hours and contact information\n\nWhat would you like to know?',
      "I'm here to assist with booking appointments and answering questions about our services. How can I help you today?",
      'Feel free to ask me about our services, availability, or to book an appointment. What can I help you with?',
    ];

    return fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
  }

  /**
   * Check availability and return formatted response
   */
  async checkAvailability(tenantId: string, params: AvailabilityQuery): Promise<TimeSlot[]> {
    try {
      // If no serviceId provided, get all services and check availability for each
      let serviceIds: string[] = [];
      if (params.serviceId) {
        serviceIds = [params.serviceId];
      } else {
        const services = await this.getServiceInfo(tenantId);
        serviceIds = services.map((s) => s.id);
      }

      if (serviceIds.length === 0) {
        return [];
      }

      const allSlots: TimeSlot[] = [];

      // Check availability for each service
      for (const serviceId of serviceIds) {
        try {
          // Handle date conversion
          let startDate: Date;
          let endDate: Date;

          if (params.date) {
            if (params.date === 'today') {
              startDate = new Date();
              endDate = new Date();
            } else {
              startDate = new Date(params.date);
              endDate = new Date(params.date);
            }
          } else {
            // Default to next 7 days
            startDate = new Date();
            endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          }

          // Build parameters for availability service
          const availabilityParams = {
            tenantId,
            serviceId,
            staffId: params.staffId,
            startDate,
            endDate,
            timezone: params.timezone || 'UTC',
          };

          const slots = await availabilityService.generateTimeSlots(availabilityParams);

          // Add service information to slots and convert format
          const formattedSlots = slots.map((slot: any) => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
            staffId: slot.staffId,
            staffName: slot.staffName || undefined,
            serviceId,
          }));

          allSlots.push(...formattedSlots);
        } catch (serviceError) {
          logger.warn(`Error checking availability for service ${serviceId}:`, serviceError);
          // Continue with other services
        }
      }

      // Sort slots by start time
      allSlots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      return allSlots;
    } catch (error) {
      logger.error('Error checking availability:', error);
      return [];
    }
  }

  /**
   * Handle availability inquiry messages
   */
  async handleAvailabilityInquiry(
    tenantId: string,
    message: string,
    timezone: string = 'UTC'
  ): Promise<string> {
    try {
      const lowerMessage = message.toLowerCase();

      // Extract date from message (enhanced implementation)
      let targetDate: string | undefined;
      const datePatterns = [
        /today/i,
        /tomorrow/i,
        /this week/i,
        /next week/i,
        /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i,
        /\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/,
        /\d{4}-\d{2}-\d{2}/,
        /\d{1,2}[-\.]\d{1,2}[-\.]\d{2,4}/,
      ];

      for (const pattern of datePatterns) {
        if (pattern.test(message)) {
          targetDate = this.parseDate(message);
          break;
        }
      }

      // Extract service preference
      let serviceId: string | undefined;
      let serviceName: string | undefined;
      const services = await this.getServiceInfo(tenantId);
      for (const service of services) {
        if (lowerMessage.includes(service.name.toLowerCase())) {
          serviceId = service.id;
          serviceName = service.name;
          break;
        }
      }

      // Extract staff preference (enhanced implementation)
      let staffId: string | undefined;
      let staffName: string | undefined;
      const staffMembers = await this.getStaffInfo(tenantId);
      for (const staff of staffMembers) {
        const staffNameLower = staff.name.toLowerCase();
        const firstNameLower = staff.name.split(' ')[0].toLowerCase();

        if (
          lowerMessage.includes(staffNameLower) ||
          lowerMessage.includes(firstNameLower) ||
          lowerMessage.includes(`with ${staffNameLower}`) ||
          lowerMessage.includes(`with ${firstNameLower}`)
        ) {
          staffId = staff.id;
          staffName = staff.name;
          break;
        }
      }

      // Get availability
      const slots = await this.checkAvailability(tenantId, {
        serviceId,
        staffId,
        date: targetDate,
        timezone,
      });

      if (slots.length === 0) {
        return await this.suggestAlternatives(tenantId, {
          serviceId,
          staffId,
          date: targetDate,
          timezone,
        });
      }

      // Format response with enhanced context
      let response = this.buildAvailabilityResponseHeader(targetDate, serviceName, staffName);

      // Group slots by date
      const slotsByDate = this.groupSlotsByDate(slots, timezone);

      for (const [date, dateSlots] of Object.entries(slotsByDate)) {
        response += `**${date}:**\n`;
        dateSlots.slice(0, 5).forEach((slot) => {
          // Show max 5 slots per date
          const timeStr = this.formatTimeSlot(slot, timezone);
          response += `• ${timeStr}${slot.staffName ? ` with ${slot.staffName}` : ''}\n`;
        });
        if (dateSlots.length > 5) {
          response += `• ... and ${dateSlots.length - 5} more slots\n`;
        }
        response += '\n';
      }

      response += 'Would you like to book one of these slots?';
      return response;
    } catch (error) {
      logger.error('Error handling availability inquiry:', error);
      return "I'm having trouble checking availability right now. Please try again or contact us directly.";
    }
  }

  /**
   * Suggest alternative dates when no slots available
   */
  async suggestAlternatives(tenantId: string, params: AvailabilityQuery): Promise<string> {
    try {
      // Try next 14 days for better alternatives
      const alternatives: { date: string; count: number }[] = [];
      const today = new Date();

      for (let i = 1; i <= 14; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);

        const slots = await this.checkAvailability(tenantId, {
          ...params,
          date: checkDate.toISOString().split('T')[0],
        });

        if (slots.length > 0) {
          const dateStr = checkDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          });
          alternatives.push({ date: dateStr, count: slots.length });
        }

        if (alternatives.length >= 5) break; // Show max 5 alternatives
      }

      if (alternatives.length === 0) {
        // Try without staff filter if originally specified
        if (params.staffId) {
          const alternativesWithoutStaff = await this.suggestAlternatives(tenantId, {
            ...params,
            staffId: undefined,
          });
          return `No slots are available with your preferred staff member for your requested time. Here are alternatives with any available staff:\n\n${alternativesWithoutStaff}`;
        }

        // Try without service filter if originally specified
        if (params.serviceId) {
          const alternativesWithoutService = await this.suggestAlternatives(tenantId, {
            ...params,
            serviceId: undefined,
          });
          return `No slots are available for your requested service and time. Here are alternatives for any service:\n\n${alternativesWithoutService}`;
        }

        return "I don't see any available slots in the next two weeks. Please contact us directly to discuss scheduling options or check back later.";
      }

      let response = params.date
        ? `No slots are available for your requested time, but I found availability on:\n\n`
        : `Here are the next available dates:\n\n`;

      alternatives.forEach(({ date, count }) => {
        const slotText = count === 1 ? '1 slot' : `${count} slots`;
        response += `• ${date} (${slotText} available)\n`;
      });

      response += '\nWould you like to check any of these dates?';
      return response;
    } catch (error) {
      logger.error('Error suggesting alternatives:', error);
      return "I'm having trouble finding alternative dates. Please contact us directly.";
    }
  }

  /**
   * Parse date from natural language (enhanced implementation)
   */
  private parseDate(message: string): string {
    const lowerMessage = message.toLowerCase();
    const today = new Date();

    // Handle relative dates
    if (lowerMessage.includes('today')) {
      return 'today';
    }

    if (lowerMessage.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    // Handle "next" + day name
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (let i = 0; i < dayNames.length; i++) {
      if (lowerMessage.includes(dayNames[i])) {
        const targetDay = this.getNextWeekday(i + 1);
        return targetDay.toISOString().split('T')[0];
      }
    }

    // Handle month names with day numbers
    const monthNames = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ];

    for (let i = 0; i < monthNames.length; i++) {
      const monthPattern = new RegExp(`${monthNames[i]}\\s+(\\d{1,2})(?:st|nd|rd|th)?`, 'i');
      const match = message.match(monthPattern);
      if (match) {
        const day = parseInt(match[1]);
        const year = today.getFullYear();
        const parsedDate = new Date(year, i, day);

        // If the date is in the past, assume next year
        if (parsedDate < today) {
          parsedDate.setFullYear(year + 1);
        }

        return parsedDate.toISOString().split('T')[0];
      }
    }

    // Handle ordinal dates like "15th", "22nd"
    const ordinalPattern = /(\d{1,2})(?:st|nd|rd|th)/i;
    const ordinalMatch = message.match(ordinalPattern);
    if (ordinalMatch) {
      const day = parseInt(ordinalMatch[1]);
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      // Try current month first, then next month if date has passed
      let parsedDate = new Date(currentYear, currentMonth, day);
      if (parsedDate < today) {
        parsedDate = new Date(currentYear, currentMonth + 1, day);
      }

      return parsedDate.toISOString().split('T')[0];
    }

    // Handle this week / next week
    if (lowerMessage.includes('this week')) {
      return today.toISOString().split('T')[0];
    }

    if (lowerMessage.includes('next week')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      return nextWeek.toISOString().split('T')[0];
    }

    // Handle date patterns like MM/DD, MM/DD/YYYY, YYYY-MM-DD, DD/MM
    const datePatterns = [
      { pattern: /(\d{4})-(\d{1,2})-(\d{1,2})/, format: 'YYYY-MM-DD' },
      { pattern: /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/, format: 'MM/DD/YYYY' },
      { pattern: /(\d{1,2})[-\.](\d{1,2})[-\.](\d{2,4})/, format: 'MM-DD-YYYY' },
      { pattern: /(\d{1,2})\s+(\d{1,2})(?:\s+(\d{2,4}))?/, format: 'MM DD YYYY' },
    ];

    for (const { pattern, format } of datePatterns) {
      const match = message.match(pattern);
      if (match) {
        try {
          let year, month, day;

          if (format === 'YYYY-MM-DD') {
            [, year, month, day] = match;
          } else {
            [, month, day, year] = match;
            if (!year) {
              year = today.getFullYear().toString();
            } else if (year.length === 2) {
              const currentYear = today.getFullYear();
              const century = Math.floor(currentYear / 100) * 100;
              year = (century + parseInt(year)).toString();
            }
          }

          const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1900) {
            return parsedDate.toISOString().split('T')[0];
          }
        } catch (error) {
          // Continue to next pattern if parsing fails
        }
      }
    }

    // If no date pattern found, don't default to today
    return 'today';
  }

  /**
   * Get the next occurrence of a specific weekday
   */
  private getNextWeekday(targetDay: number): Date {
    const today = new Date();
    const currentDay = today.getDay();
    const daysUntilTarget = (targetDay - currentDay + 7) % 7;

    // If it's the same day, get next week's occurrence
    const daysToAdd = daysUntilTarget === 0 ? 7 : daysUntilTarget;

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);
    return targetDate;
  }

  /**
   * Group time slots by date
   */
  private groupSlotsByDate(slots: TimeSlot[], timezone: string): Record<string, TimeSlot[]> {
    const grouped: Record<string, TimeSlot[]> = {};

    slots.forEach((slot) => {
      const date = slot.startTime.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        timeZone: timezone,
      });

      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(slot);
    });

    return grouped;
  }

  /**
   * Format time slot for display
   */
  private formatTimeSlot(slot: TimeSlot, timezone: string): string {
    const startTime = slot.startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone,
    });

    return startTime;
  }

  /**
   * Extract basic intent from user message
   */
  private extractIntent(message: string): string {
    const lowerMessage = message.toLowerCase();

    // Check for booking-related intents first
    if (
      lowerMessage.includes('book') ||
      lowerMessage.includes('appointment') ||
      lowerMessage.includes('schedule')
    ) {
      return 'booking';
    }

    // Check if message contains email - likely booking info
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    if (emailPattern.test(message)) {
      return 'booking';
    }

    // Check if message contains explicit name patterns - likely booking info
    const namePatterns = [
      /(?:my name is|i'm|i am|call me)\s+[a-zA-Z\s]+/i,
      // Only treat as name if it's a simple 2-3 word name without common greeting words
      /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\s*$/  // Proper name format like "John Smith" or "Mary Jane Doe"
    ];
    
    // Don't treat common greetings as names
    const isGreeting = lowerMessage.includes('hello') || lowerMessage.includes('hi') || 
                      lowerMessage.includes('hey') || lowerMessage.includes('good') ||
                      lowerMessage.includes('there') || lowerMessage.includes('how');
    
    if (!isGreeting && namePatterns.some(pattern => pattern.test(message))) {
      return 'booking';
    }

    if (
      lowerMessage.includes('available') ||
      lowerMessage.includes('availability') ||
      lowerMessage.includes('when')
    ) {
      return 'availability';
    }

    if (
      lowerMessage.includes('service') ||
      lowerMessage.includes('price') ||
      lowerMessage.includes('cost')
    ) {
      return 'service_info';
    }

    if (
      lowerMessage.includes('hours') ||
      lowerMessage.includes('open') ||
      lowerMessage.includes('closed')
    ) {
      return 'business_hours';
    }

    return 'general';
  }

  /**
   * Extract booking intent and collect required information
   */
  extractBookingIntent(message: string): BookingIntent | null {
    const lowerMessage = message.toLowerCase();

    // Check if this is a booking-related message
    const isBookingMessage = 
      lowerMessage.includes('book') ||
      lowerMessage.includes('appointment') ||
      lowerMessage.includes('schedule') ||
      lowerMessage.includes('reserve');

    const intent: BookingIntent = {
      type: 'booking',
    };

    // Extract customer information using regex patterns
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b\(\d{3}\)\s?\d{3}[-.]?\d{4}\b/;
    const namePatterns = [
      /(?:my name is|i'm|i am|call me)\s+([a-zA-Z\s]+?)(?:\s+and|\s*,|\s*\.|\s*$)/i,
      /(?:name:?\s*)([a-zA-Z\s]+?)(?:\s+email|\s*,|\s*\.|\s*$)/i,
      /^([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s*$/, // Just a name by itself
      /^([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+[a-zA-Z0-9._%+-]+@/, // Name followed by email
    ];

    const emailMatch = message.match(emailPattern);
    const phoneMatch = message.match(phonePattern);

    let nameMatch = null;
    for (const pattern of namePatterns) {
      nameMatch = message.match(pattern);
      if (nameMatch && nameMatch[1]) {
        const extractedName = nameMatch[1].trim();
        const lowerName = extractedName.toLowerCase();
        
        // Exclude obvious non-names
        const excludeWords = [
          'book', 'appointment', 'schedule', 'reserve', 'hello', 'hi', 'hey', 
          'good', 'morning', 'afternoon', 'evening', 'thanks', 'thank', 'you',
          'please', 'help', 'me', 'for', 'with', 'want', 'need', 'like', 'would',
          'first', 'second', 'third', 'one', 'two', 'three', 'service', 'ine', 'an'
        ];
        
        const containsExcludeWords = excludeWords.some(word => lowerName.includes(word));
        
        // Validate it's a reasonable name (2-50 chars, only letters and spaces, no exclude words)
        if (
          extractedName.length >= 2 &&
          extractedName.length <= 50 &&
          /^[a-zA-Z\s]+$/.test(extractedName) &&
          !containsExcludeWords &&
          extractedName.split(' ').length <= 3 // Max 3 words for a name
        ) {
          break;
        } else {
          nameMatch = null;
        }
      }
    }

    // If we found customer info, create intent even if not explicitly booking-related
    if (emailMatch || phoneMatch || nameMatch) {
      intent.customerInfo = {};
      if (emailMatch) intent.customerInfo.email = emailMatch[0];
      if (phoneMatch) intent.customerInfo.phone = phoneMatch[0];
      if (nameMatch) intent.customerInfo.name = nameMatch[1].trim();
      return intent;
    }

    // Only return booking intent if it's explicitly booking-related
    return isBookingMessage ? intent : null;
  }

  /**
   * Validate collected customer information
   */
  validateCustomerInfo(customerInfo: { name?: string; email?: string; phone?: string }): {
    isValid: boolean;
    missing: string[];
  } {
    const missing: string[] = [];

    if (!customerInfo.name || customerInfo.name.trim().length < 2) {
      missing.push('name');
    }

    if (!customerInfo.email || !this.isValidEmail(customerInfo.email)) {
      missing.push('email');
    }

    // Phone is optional but if provided should be valid
    if (customerInfo.phone && !this.isValidPhone(customerInfo.phone)) {
      missing.push('valid phone number');
    }

    return {
      isValid: missing.length === 0,
      missing,
    };
  }

  /**
   * Create appointment via backend API
   */
  async createBooking(tenantId: string, bookingData: AIBookingData): Promise<any> {
    try {
      // Validate booking data
      const validation = this.validateCustomerInfo(bookingData.customerInfo);
      if (!validation.isValid) {
        throw new Error(`Missing required information: ${validation.missing.join(', ')}`);
      }

      // Get service details to calculate end time and amount
      const services = await this.getServiceInfo(tenantId);
      const service = services.find((s) => s.id === bookingData.serviceId);
      if (!service) {
        throw new Error('Service not found');
      }

      // Calculate end time based on service duration
      const endTime = new Date(
        bookingData.startTime.getTime() + service.durationMinutes * 60 * 1000
      );

      // Create appointment using appointment service
      const appointmentData = {
        serviceId: bookingData.serviceId,
        startTime: bookingData.startTime,
        endTime: endTime,
        customerTimezone: bookingData.timezone,
        customerName: bookingData.customerInfo.name,
        customerEmail: bookingData.customerInfo.email,
        customerPhone: bookingData.customerInfo.phone,
        staffId: bookingData.staffId,
        notes: bookingData.notes,
        paymentOption: bookingData.paymentOption,
        amount: service.price,
      };

      const appointment = await appointmentService.createAppointment(tenantId, appointmentData);
      return appointment;
    } catch (error) {
      logger.error('Error creating AI booking:', error);
      throw error;
    }
  }

  /**
   * Handle booking flow messages
   */
  async handleBookingFlow(
    tenantId: string,
    message: string,
    conversationHistory: IAIMessage[]
  ): Promise<string> {
    try {
      const lowerMessage = message.toLowerCase();
      
      logger.info('Booking flow - Processing message:', { message, tenantId });

      // Extract any previous customer info from conversation history
      const previousInfo = this.extractInfoFromHistory(conversationHistory);
      
      // Extract previous booking state from conversation history
      const previousBookingState = this.extractBookingStateFromHistory(conversationHistory);

      // Extract booking intent and collect information from current message
      const bookingIntent = this.extractBookingIntent(message);
      const currentInfo =
        bookingIntent?.customerInfo || this.extractCustomerInfoFromMessage(message);

      // Combine all available information
      const combinedInfo = { ...previousInfo, ...currentInfo };
      
      logger.info('Booking flow - Customer info:', { previousInfo, currentInfo, combinedInfo });
      logger.info('Booking flow - Previous booking state:', previousBookingState);

      // Extract service preference from message and history
      let serviceId: string | undefined = bookingIntent?.serviceId || previousBookingState.serviceId;
      let serviceName: string | undefined = previousBookingState.serviceName;

      // If we have a stored service selection (like "service_1"), resolve it to actual service
      if (!serviceId && serviceName && serviceName.startsWith('service_')) {
        const services = await this.getServiceInfo(tenantId);
        const serviceIndex = parseInt(serviceName.split('_')[1]) - 1;
        if (serviceIndex >= 0 && serviceIndex < services.length) {
          serviceId = services[serviceIndex].id;
          serviceName = services[serviceIndex].name;
        }
      }

      if (!serviceId) {
        const services = await this.getServiceInfo(tenantId);
        
        // Try to match service from current message
        for (const service of services) {
          if (lowerMessage.includes(service.name.toLowerCase())) {
            serviceId = service.id;
            serviceName = service.name;
            break;
          }
        }
        
        // If still no service found, check if user is selecting by number or position
        if (!serviceId && services.length > 0) {
          const numberMatch = message.match(/(\d+)/);
          if (numberMatch) {
            const selectedIndex = parseInt(numberMatch[1]) - 1;
            if (selectedIndex >= 0 && selectedIndex < services.length) {
              serviceId = services[selectedIndex].id;
              serviceName = services[selectedIndex].name;
            }
          }
          
          // Check for first/second/third etc.
          const ordinalWords = ['first', 'second', 'third', 'fourth', 'fifth'];
          for (let i = 0; i < ordinalWords.length && i < services.length; i++) {
            if (lowerMessage.includes(ordinalWords[i])) {
              serviceId = services[i].id;
              serviceName = services[i].name;
              break;
            }
          }
        }
      }

      // Extract date and time preferences from current message and history
      let preferredDate = bookingIntent?.preferredDate || previousBookingState.preferredDate;
      let preferredTime = bookingIntent?.preferredTime || previousBookingState.preferredTime;

      // Try to extract from current message if not found in history
      if (!preferredDate) {
        preferredDate = this.extractDateFromMessage(message);
      }

      if (!preferredTime) {
        preferredTime = this.extractTimeFromMessage(message);
      }

      logger.info('Booking flow - Date/Time extraction:', { 
        message, 
        preferredDate, 
        preferredTime,
        bookingIntentDate: bookingIntent?.preferredDate,
        bookingIntentTime: bookingIntent?.preferredTime,
        historyDate: previousBookingState.preferredDate,
        historyTime: previousBookingState.preferredTime
      });

      // Extract payment preference
      let paymentOption: 'prepaid' | 'pay_at_venue' = 'pay_at_venue';
      if (
        lowerMessage.includes('prepaid') ||
        lowerMessage.includes('pay now') ||
        lowerMessage.includes('pay online')
      ) {
        paymentOption = 'prepaid';
      }

      // Check what information we still need
      const validation = this.validateCustomerInfo(combinedInfo);
      const needsService = !serviceId;
      const needsDateTime = !preferredDate || !preferredTime || preferredDate === 'today';

      logger.info('Booking flow - Validation check:', { 
        validation, 
        needsService, 
        needsDateTime,
        serviceId,
        serviceName,
        preferredDate,
        preferredTime,
        combinedInfo,
        validationMissing: validation.missing,
        validationIsValid: validation.isValid
      });

      // If this is the initial booking request
      if (
        !bookingIntent &&
        (lowerMessage.includes('book') ||
          lowerMessage.includes('appointment') ||
          lowerMessage.includes('schedule'))
      ) {
        return "I'd be happy to help you book an appointment! To get started, I'll need:\n\n• Your name and email\n• Which service you're interested in\n• Your preferred date and time\n\nLet's start with your name - what should I call you?";
      }

      // If we're missing customer information
      if (!validation.isValid) {
        logger.info('Booking flow - Missing customer info:', { missing: validation.missing, combinedInfo });
        return this.requestMissingInfo(validation.missing, combinedInfo);
      }

      // If we're missing service selection
      if (needsService) {
        const services = await this.getServiceInfo(tenantId);
        if (services.length === 0) {
          return "I'm sorry, but there are no services available for booking at the moment. Please contact us directly.";
        }

        let response =
          'Great! I have your contact information. Now, which service would you like to book?\n\n';
        services.forEach((service) => {
          response += `• ${service.name} - ${service.durationMinutes} minutes, ${service.price} ${service.currency}\n`;
        });
        response += '\nJust let me know which service interests you!';
        return response;
      }

      // If we're missing date/time
      if (needsDateTime) {
        if (!preferredDate || preferredDate === 'today') {
          return `Perfect! I'll book ${serviceName || 'your service'} for you. When would you like to schedule your appointment? Please provide your preferred date (e.g., "December 15th", "tomorrow", "next Monday", or "12/15/2024").`;
        } else if (!preferredTime) {
          return `Great! I have your date as ${preferredDate}. What time would you prefer? Please provide a time like "2:30 PM", "9 AM", or "14:00".`;
        }
      }

      // We have all information - proceed with booking
      try {
        // Ensure we have required data
        if (!serviceId || !preferredDate || !preferredTime) {
          return 'I need more information to complete your booking. Please provide the service, date, and time.';
        }

        // Parse the date and time
        const startTime = this.parseDateTime(preferredDate, preferredTime);
        if (!startTime) {
          return "I'm having trouble understanding the date and time you specified. Could you please provide it in a format like 'December 15th at 2:00 PM' or '2024-12-15 14:00'?";
        }

        // Get service details for duration calculation
        const services = await this.getServiceInfo(tenantId);
        const selectedService = services.find((s) => s.id === serviceId);
        if (!selectedService) {
          return "I'm sorry, but I couldn't find the selected service. Please choose from our available services.";
        }

        const endTime = new Date(startTime.getTime() + selectedService.durationMinutes * 60 * 1000);

        // Check if user is selecting from previously suggested alternatives
        const recentAssistantMessages = conversationHistory
          .filter(msg => msg.role === 'assistant')
          .slice(-2); // Check last 2 assistant messages
        
        const wasShowingAlternatives = recentAssistantMessages.some(msg => 
          msg.content.includes('alternatives for the same day') ||
          msg.content.includes('Would any of these work for you')
        );
        
        // If user is selecting from suggested alternatives, trust their selection
        let isAvailable = true;
        if (!wasShowingAlternatives) {
          // Only check availability if this is a new time request, not a selection from alternatives
          isAvailable = await this.checkSlotAvailability(
            tenantId,
            serviceId,
            startTime,
            endTime
          );
        }
        
        if (!isAvailable) {
          return await this.suggestAlternativeSlots(tenantId, serviceId, startTime);
        }

        const bookingData: AIBookingData = {
          serviceId,
          staffId: bookingIntent?.staffId,
          startTime,
          customerInfo: combinedInfo as Required<typeof combinedInfo>,
          paymentOption,
          notes: 'Booked via AI assistant',
          timezone: 'UTC', // Default timezone, could be enhanced to detect customer timezone
        };

        const appointment = await this.createBooking(tenantId, bookingData);
        return this.generateBookingConfirmation(appointment, paymentOption);
      } catch (error) {
        return this.handleBookingFailure(error as Error, tenantId);
      }
    } catch (error) {
      logger.error('Error handling booking flow:', error);
      return "I'm having trouble processing your booking request. Please try again or contact us directly.";
    }
  }

  /**
   * Extract booking state from conversation history
   */
  private extractBookingStateFromHistory(history: IAIMessage[]): {
    serviceId?: string;
    serviceName?: string;
    preferredDate?: string;
    preferredTime?: string;
  } {
    const state: {
      serviceId?: string;
      serviceName?: string;
      preferredDate?: string;
      preferredTime?: string;
    } = {};

    // Look through all user messages for date/time/service information
    for (const message of history) {
      if (message.role === 'user') {
        // Extract date if not already found
        if (!state.preferredDate) {
          const extractedDate = this.extractDateFromMessage(message.content);
          if (extractedDate && extractedDate !== 'today') {
            state.preferredDate = extractedDate;
          }
        }

        // Extract time if not already found
        if (!state.preferredTime) {
          const extractedTime = this.extractTimeFromMessage(message.content);
          if (extractedTime) {
            state.preferredTime = extractedTime;
          }
        }

        // Extract service selection (numbers, ordinals, or service names)
        if (!state.serviceId && !state.serviceName) {
          const lowerContent = message.content.toLowerCase();
          
          // Don't extract service numbers from time expressions
          const isTimeExpression = /\d+\s*(am|pm|:\d+)/i.test(message.content) ||
                                  lowerContent.includes('o\'clock') ||
                                  lowerContent.includes('morning') ||
                                  lowerContent.includes('afternoon') ||
                                  lowerContent.includes('evening');
          
          // Don't extract service numbers from date expressions
          const isDateExpression = lowerContent.includes('tomorrow') ||
                                  lowerContent.includes('today') ||
                                  lowerContent.includes('monday') ||
                                  lowerContent.includes('tuesday') ||
                                  lowerContent.includes('wednesday') ||
                                  lowerContent.includes('thursday') ||
                                  lowerContent.includes('friday') ||
                                  lowerContent.includes('saturday') ||
                                  lowerContent.includes('sunday') ||
                                  /\d+\/\d+/.test(message.content) ||
                                  /\d+-\d+-\d+/.test(message.content);
          
          if (!isTimeExpression && !isDateExpression) {
            // Check for number selection (1, 2, 3, etc.) - only if it's not a time/date
            const numberMatch = message.content.match(/^(\d+)$/); // Only standalone numbers
            if (numberMatch) {
              state.serviceName = `service_${numberMatch[1]}`;
            } else {
              // Check for ordinal selection (first, second, etc.)
              const ordinalWords = ['first', 'second', 'third', 'fourth', 'fifth'];
              for (let i = 0; i < ordinalWords.length; i++) {
                if (lowerContent.includes(ordinalWords[i])) {
                  state.serviceName = `service_${i + 1}`;
                  break;
                }
              }
            }
          }
        }
      }
    }

    return state;
  }

  /**
   * Extract customer info from conversation history
   */
  private extractInfoFromHistory(
    history: IAIMessage[]
  ): Partial<{ name: string; email: string; phone: string }> {
    const info: Partial<{ name: string; email: string; phone: string }> = {};

    for (const message of history) {
      if (message.role === 'user') {
        const emailMatch = message.content.match(
          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
        );
        const phoneMatch = message.content.match(
          /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b\(\d{3}\)\s?\d{3}[-.]?\d{4}\b/
        );

        // Only extract names when explicitly provided with clear indicators
        const namePatterns = [
          /(?:my name is|i'm|i am|call me)\s+([a-zA-Z\s]+?)(?:\s+and|\s*,|\s*\.|\s*$)/i,
          /(?:name:?\s*)([a-zA-Z\s]+?)(?:\s+email|\s*,|\s*\.|\s*$)/i,
          /^([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+[a-zA-Z0-9._%+-]+@/, // Name followed by email
        ];

        // Check if any recent assistant message was asking for a name
        const recentAssistantMessages = history.filter((msg) => msg.role === 'assistant').slice(-3); // Check last 3 assistant messages

        const wasAskingForName = recentAssistantMessages.some(
          (msg) =>
            msg.content.toLowerCase().includes('name') ||
            msg.content.toLowerCase().includes('what should i call you') ||
            msg.content.toLowerCase().includes("what's your name")
        );

        let nameMatch = null;

        // Only extract names if we were asking for a name, or if it's explicitly stated
        if (wasAskingForName) {
          // If we were asking for name, treat simple responses as names
          const simpleNamePattern = /^([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})\s*$/;
          const simpleMatch = message.content.match(simpleNamePattern);

          if (simpleMatch && simpleMatch[1]) {
            const extractedName = simpleMatch[1].trim();
            const lowerName = extractedName.toLowerCase();

            // Exclude obvious non-names
            const excludeWords = [
              'book',
              'appointment',
              'schedule',
              'reserve',
              'hello',
              'hi',
              'hey',
              'good',
              'morning',
              'afternoon',
              'evening',
              'thanks',
              'thank',
              'you',
              'please',
              'help',
              'me',
              'for',
              'with',
              'want',
              'need',
              'like',
              'would',
              'first',
              'second',
              'third',
              'one',
              'two',
              'three',
              'service',
              'ine',
            ];

            const containsExcludeWords = excludeWords.some((word) => lowerName.includes(word));

            if (
              extractedName.length >= 2 &&
              extractedName.length <= 50 &&
              /^[a-zA-Z\s]+$/.test(extractedName) &&
              !containsExcludeWords &&
              extractedName.split(' ').length <= 3 // Max 3 words for a name
            ) {
              nameMatch = { 1: extractedName };
            }
          }
        } else {
          // Only extract names with explicit indicators
          for (const pattern of namePatterns) {
            nameMatch = message.content.match(pattern);
            if (nameMatch && nameMatch[1]) {
              const extractedName = nameMatch[1].trim();

              // Validate it's a reasonable name
              if (
                extractedName.length >= 2 &&
                extractedName.length <= 50 &&
                /^[a-zA-Z\s]+$/.test(extractedName) &&
                extractedName.split(' ').length <= 3
              ) {
                break;
              } else {
                nameMatch = null;
              }
            }
          }
        }

        if (emailMatch && !info.email) info.email = emailMatch[0];
        if (phoneMatch && !info.phone) info.phone = phoneMatch[0];
        if (nameMatch && !info.name) info.name = nameMatch[1].trim();
      }
    }

    return info;
  }

  /**
   * Extract customer info from any message
   */
  private extractCustomerInfoFromMessage(message: string): Partial<{ name: string; email: string; phone: string }> {
    const info: Partial<{ name: string; email: string; phone: string }> = {};

    // Extract email first (highest priority)
    const emailMatch = message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) info.email = emailMatch[0];

    // Extract phone
    const phoneMatch = message.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b\(\d{3}\)\s?\d{3}[-.]?\d{4}\b/);
    if (phoneMatch) info.phone = phoneMatch[0];

    // Only extract name if the message doesn't contain an email (to avoid confusion)
    // and only with explicit name indicators - don't guess from random text
    if (!emailMatch) {
      const namePatterns = [
        /(?:my name is|i'm|i am|call me)\s+([a-zA-Z\s]+?)(?:\s+and|\s*,|\s*\.|\s*$)/i,
        /(?:name:?\s*)([a-zA-Z\s]+?)(?:\s+email|\s*,|\s*\.|\s*$)/i,
        // Removed the generic pattern that was causing issues
      ];

      for (const pattern of namePatterns) {
        const nameMatch = message.match(pattern);
        if (nameMatch && nameMatch[1]) {
          const extractedName = nameMatch[1].trim();
          
          // Validate it's a reasonable name
          if (
            extractedName.length >= 2 &&
            extractedName.length <= 50 &&
            /^[a-zA-Z\s]+$/.test(extractedName) &&
            extractedName.split(' ').length <= 3
          ) {
            info.name = extractedName;
            break;
          }
        }
      }
    }

    return info;
  }

  /**
   * Check if conversation is in booking flow
   */
  private isInBookingFlow(history: IAIMessage[]): boolean {
    logger.info('Checking booking flow context', {
      historyLength: history.length,
      recentMessages: history
        .slice(-5)
        .map((m) => ({ role: m.role, content: m.content.substring(0, 100) })),
    });

    // Look at the last few assistant messages to see if we're asking for booking info
    const recentAssistantMessages = history
      .filter((msg) => msg.role === 'assistant')
      .slice(-5) // Check last 5 assistant messages (increased from 3)
      .map((msg) => msg.content.toLowerCase());

    const bookingKeywords = [
      'book an appointment',
      'your name',
      'your email',
      'email address', // Added this key phrase
      'which service',
      'preferred date',
      'preferred time',
      'schedule your appointment',
      'complete your booking',
      "what's your name",
      "what's your email",
      'what is your name',
      'what is your email',
      'to complete your booking',
      'need your name',
      'need your email',
      'would you like to book',
      'book your appointment',
      'help you book',
      'booking information',
      'appointment booking',
      'contact information',
      'get started',
    ];

    const hasBookingKeywords = recentAssistantMessages.some((content) =>
      bookingKeywords.some((keyword) => content.includes(keyword))
    );

    // Also check if user has provided booking-related information recently
    const recentUserMessages = history
      .filter(msg => msg.role === 'user')
      .slice(-3)
      .map(msg => msg.content.toLowerCase());

    const userBookingIndicators = recentUserMessages.some(content => {
      // Check if user provided email
      const hasEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(content);
      // Check if user mentioned booking
      const hasBookingIntent = content.includes('book') || content.includes('appointment') || content.includes('schedule');
      // Check if user provided name patterns
      const hasNamePattern = /(?:my name is|i'm|i am|call me)\s+[a-zA-Z\s]+/i.test(content);
      
      return hasEmail || hasBookingIntent || hasNamePattern;
    });

    const isInFlow = hasBookingKeywords || userBookingIndicators;
    
    logger.info('Booking flow detection result:', { 
      hasBookingKeywords, 
      userBookingIndicators, 
      isInFlow,
      recentAssistantMessages: recentAssistantMessages.slice(0, 2),
      recentUserMessages: recentUserMessages.slice(0, 2)
    });

    return isInFlow;
  }

  /**
   * Request missing information from customer
   */
  private requestMissingInfo(missing: string[], currentInfo: any): string {
    logger.info('Requesting missing info:', { missing, currentInfo });
    
    // If we have email but need name
    if (missing.includes('name') && currentInfo.email) {
      return "Great! I have your email. Now, what's your name?";
    }
    
    // If we have name but need email  
    if (missing.includes('email') && currentInfo.name) {
      return `Nice to meet you, ${currentInfo.name}! What's your email address?`;
    }
    
    // If we need both
    if (missing.includes('name') && missing.includes('email')) {
      return "To complete your booking, I need your name and email. Let's start with your name - what should I call you?";
    }
    
    // Default fallback
    const missingList = missing.join(' and ');
    let response = `To complete your booking, I need your ${missingList}. `;

    if (missing.includes('name')) {
      response += "What's your name? ";
    } else if (missing.includes('email')) {
      response += "What's your email address? ";
    }

    return response;
  }

  /**
   * Extract date from message text
   */
  private extractDateFromMessage(message: string): string | undefined {
    const result = this.parseDate(message);
    logger.info('Date extraction:', { message, result });
    
    // Don't return 'today' as default if no date was actually found in the message
    if (result === 'today' && !message.toLowerCase().includes('today')) {
      return undefined;
    }
    
    return result;
  }

  /**
   * Extract time from message text
   */
  private extractTimeFromMessage(message: string): string | undefined {
    const timePatterns = [
      /(\d{1,2}):(\d{2})\s*(am|pm)/i, // 2:30 PM
      /(\d{1,2})\s*(am|pm)/i, // 9 AM
      /(\d{1,2}):(\d{2})(?!\s*(?:am|pm))/i, // 14:00 (not followed by am/pm)
      /(\d{1,2})\.(\d{2})/, // 14.30
      /at\s+(\d{1,2}):(\d{2})\s*(am|pm)/i, // at 2:30 PM
      /at\s+(\d{1,2})\s*(am|pm)/i, // at 9 AM
    ];

    for (const pattern of timePatterns) {
      const match = message.match(pattern);
      if (match) {
        try {
          let hour, minute, ampm;

          // Check if this is the AM/PM pattern without minutes
          if (pattern.source.includes('am|pm') && !pattern.source.includes(':')) {
            // Pattern: /(\d{1,2})\s*(am|pm)/i - "9 AM" or "at 9 AM"
            hour = parseInt(match[1]);
            minute = 0;
            ampm = match[2].toLowerCase();

            if (ampm === 'pm' && hour !== 12) hour += 12;
            if (ampm === 'am' && hour === 12) hour = 0;
          } else if (match[3]) {
            // Has AM/PM with minutes - "2:30 PM" or "at 2:30 PM"
            hour = parseInt(match[1]);
            minute = parseInt(match[2]);
            ampm = match[3].toLowerCase();

            if (ampm === 'pm' && hour !== 12) hour += 12;
            if (ampm === 'am' && hour === 12) hour = 0;
          } else {
            // 24-hour format - "14:00" or "14.30"
            hour = parseInt(match[1]);
            minute = match[2] ? parseInt(match[2]) : 0;
          }

          // Validate time
          if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
            const result = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            logger.info('Time extraction successful:', {
              message,
              result,
              pattern: pattern.source,
            });
            return result;
          }
        } catch (error) {
          logger.warn('Time extraction error:', { message, error, pattern: pattern.source });
          continue;
        }
      }
    }

    logger.info('Time extraction failed - no pattern matched:', { message });
    return undefined;
  }

  /**
   * Parse date and time into a Date object
   */
  private parseDateTime(dateStr: string, timeStr: string): Date | null {
    try {
      let targetDate: Date;

      if (dateStr === 'today') {
        targetDate = new Date();
      } else if (dateStr === 'tomorrow') {
        targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 1);
      } else {
        targetDate = new Date(dateStr);
      }

      if (isNaN(targetDate.getTime())) {
        return null;
      }

      // Parse time
      const [hours, minutes] = timeStr.split(':').map(Number);
      targetDate.setHours(hours, minutes, 0, 0);

      return targetDate;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a specific slot is available
   */
  private async checkSlotAvailability(
    tenantId: string,
    serviceId: string,
    startTime: Date,
    endTime: Date,
    staffId?: string
  ): Promise<boolean> {
    try {
      const slots = await this.checkAvailability(tenantId, {
        serviceId,
        staffId,
        date: startTime.toISOString().split('T')[0],
      });

      // Check if any slot matches our requested time (with some tolerance for time differences)
      return slots.some((slot) => {
        const slotStart = slot.startTime.getTime();
        const slotEnd = slot.endTime.getTime();
        const requestedStart = startTime.getTime();
        const requestedEnd = endTime.getTime();
        
        // Allow for small time differences (up to 1 minute = 60000ms)
        const tolerance = 60000;
        
        return (
          Math.abs(slotStart - requestedStart) <= tolerance &&
          Math.abs(slotEnd - requestedEnd) <= tolerance
        );
      });
    } catch (error) {
      logger.error('Error checking slot availability:', error);
      return false;
    }
  }

  /**
   * Suggest alternative slots when requested time is not available
   */
  private async suggestAlternativeSlots(
    tenantId: string,
    serviceId: string,
    requestedTime: Date
  ): Promise<string> {
    try {
      // Get alternatives for the same day
      const sameDay = await this.checkAvailability(tenantId, {
        serviceId,
        date: requestedTime.toISOString().split('T')[0],
      });

      if (sameDay.length > 0) {
        let response =
          "That time slot isn't available, but I found these alternatives for the same day:\n\n";
        sameDay.slice(0, 3).forEach((slot) => {
          const timeStr = this.formatTimeSlot(slot, 'UTC');
          response += `• ${timeStr}\n`;
        });
        response += '\nWould any of these work for you?';
        return response;
      }

      // Get alternatives for next few days
      const alternatives = await this.suggestAlternatives(tenantId, {
        serviceId,
        date: requestedTime.toISOString().split('T')[0],
      });

      return `That time slot isn't available. ${alternatives}`;
    } catch (error) {
      logger.error('Error suggesting alternative slots:', error);
      return "That time slot isn't available. Let me check for other available times - what other dates might work for you?";
    }
  }

  /**
   * Generate booking confirmation message
   */
  private generateBookingConfirmation(appointment: any, paymentOption?: string): string {
    const date = new Date(appointment.startTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const time = new Date(appointment.startTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    let confirmation = `✅ Your appointment has been confirmed!\n\n`;
    confirmation += `📅 **Date:** ${date}\n`;
    confirmation += `🕐 **Time:** ${time}\n`;
    confirmation += `💼 **Service:** ${appointment.service?.name || 'Service'}\n`;

    if (appointment.staff?.name) {
      confirmation += `👤 **Staff:** ${appointment.staff.name}\n`;
    }

    confirmation += `\n📧 You'll receive a confirmation email shortly with all the details.\n`;

    const finalPaymentOption = paymentOption || appointment.paymentOption;
    if (finalPaymentOption === 'prepaid') {
      confirmation += `\n💳 **Payment:** Please complete payment using the link we'll send you.`;
      // Add payment link generation here if needed
      confirmation += `\n🔗 **Payment Link:** [Complete your payment here]`;
    } else {
      confirmation += `\n💳 **Payment:** You can pay when you arrive for your appointment.`;
    }

    return confirmation;
  }

  /**
   * Handle booking failures and suggest alternatives
   */
  private async handleBookingFailure(error: Error, tenantId: string): Promise<string> {
    logger.error('Booking failure:', error);

    if (error.message.includes('slot') || error.message.includes('available')) {
      // Slot no longer available - suggest alternatives
      return "I'm sorry, but that time slot is no longer available. Someone else may have just booked it. Let me check for alternative times that might work for you. What other dates or times would be convenient?";
    }

    if (error.message.includes('service') || error.message.includes('Service not found')) {
      // Service issue - show available services
      try {
        const services = await this.getServiceInfo(tenantId);
        if (services.length === 0) {
          return "I'm sorry, but there are no services available for booking at the moment. Please contact us directly.";
        }

        let response =
          'There seems to be an issue with the selected service. Here are our available services:\n\n';
        services.forEach((service) => {
          response += `• ${service.name} - ${service.durationMinutes} minutes, ${service.price} ${service.currency}\n`;
        });
        response += '\nWhich service would you like to book?';
        return response;
      } catch (serviceError) {
        return 'There seems to be an issue with the selected service. Please contact us directly to complete your booking.';
      }
    }

    if (error.message.includes('Staff')) {
      return "There's an issue with the selected staff member. Would you like me to check availability with any available staff member, or do you have a preference for a specific person?";
    }

    if (error.message.includes('Missing required information')) {
      return `I need some additional information to complete your booking: ${error.message.replace('Missing required information: ', '')}. Could you please provide this information?`;
    }

    // Generic error
    return 'I encountered an issue while booking your appointment. This might be a temporary problem. Please try again in a moment, or contact us directly to complete your booking.';
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }
}

export const aiAssistantService = new AIAssistantService();
