'use client';

import { useCallback, useEffect, useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatConfig {
  tenantId: string;
  welcomeMessage: string;
  placeholder: string;
  theme: {
    primaryColor: string;
    textColor: string;
  };
}

interface UseChatWidgetProps {
  tenantId: string;
  apiUrl?: string;
  pollingInterval?: number; // For real-time updates
}

export function useChatWidget({
  tenantId,
  apiUrl = '/api',
  pollingInterval = 5000,
}: UseChatWidgetProps) {
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Load chat widget configuration
  const loadConfig = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/ai/widget/config`, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load chat configuration');
      }

      const data = await response.json();
      if (data.success) {
        setConfig(data.data);
        setIsConnected(true);
      } else {
        throw new Error(data.error || 'Failed to load configuration');
      }
    } catch (err) {
      console.error('Error loading chat config:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chat configuration');
      setIsConnected(false);
    }
  }, [tenantId, apiUrl]);

  // Send message to AI assistant
  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      if (!content.trim() || isLoading) return false;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiUrl}/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': tenantId,
          },
          body: JSON.stringify({
            message: content.trim(),
            conversationId,
            channel: 'web',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.data.message,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, assistantMessage]);

          // Store conversation ID for future messages
          if (data.data.conversationId && !conversationId) {
            setConversationId(data.data.conversationId);
          }

          return true;
        } else {
          throw new Error(data.error || 'Failed to get response from assistant');
        }
      } catch (err) {
        console.error('Error sending message:', err);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setError(err instanceof Error ? err.message : 'Failed to send message');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [tenantId, apiUrl, conversationId, isLoading]
  );

  // Clear conversation
  const clearConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);

    // Re-add welcome message if config is loaded
    if (config) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: config.welcomeMessage,
          timestamp: new Date(),
        },
      ]);
    }
  }, [config]);

  // Retry connection
  const retry = useCallback(() => {
    setError(null);
    loadConfig();
  }, [loadConfig]);

  // Initialize chat widget
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Initialize with welcome message when config loads
  useEffect(() => {
    if (config && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: config.welcomeMessage,
          timestamp: new Date(),
        },
      ]);
    }
  }, [config, messages.length]);

  // Optional: Implement polling for real-time updates
  // This could be used to check for new messages in multi-user scenarios
  useEffect(() => {
    if (!conversationId || !pollingInterval) return;

    const interval = setInterval(async () => {
      // This would poll for new messages if needed
      // For now, we'll skip this as it's not required for basic functionality
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [conversationId, pollingInterval]);

  return {
    // State
    config,
    messages,
    conversationId,
    isLoading,
    error,
    isConnected,

    // Actions
    sendMessage,
    clearConversation,
    retry,
  };
}
