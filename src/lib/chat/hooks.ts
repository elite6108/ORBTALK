'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '../supabase/client';
import { getChannelMessages } from './actions';
import type { Message, TypingUser } from './types';

/**
 * Hook for real-time message subscriptions
 */
export function useChannelMessages(channelId: string, initialData?: {
  error: string | null;
  messages?: Message[];
  channel?: { id: string; name: string; server_id: string; server_name: string | null };
}) {
  const [messages, setMessages] = useState<Message[]>(initialData?.messages ?? []);
  const [channelName, setChannelName] = useState<string>(initialData?.channel?.name ?? '');
  const [serverName, setServerName] = useState<string>(initialData?.channel?.server_name ?? '');
  const [loading, setLoading] = useState(!initialData || (!!initialData && initialData.messages === undefined));
  const [error, setError] = useState<string | null>(initialData?.error ?? null);
  const supabase = createClient();

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { error: fetchError, messages, channel } = await getChannelMessages(channelId, 50, 0);

      if (fetchError) {
        console.error('Error fetching messages:', fetchError);
        setError('Failed to load messages');
        return;
      }

      setMessages(messages || []);
      setChannelName(channel?.name || '');
      setServerName(channel?.server_name || '');
    } catch (err) {
      console.error('Unexpected error fetching messages:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    if (!channelId) return;

    fetchMessages();

    // Subscribe to real-time message changes
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          console.log('New message received:', payload);
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          console.log('Message updated:', payload);
          setMessages(prev => 
            prev.map(msg => 
              msg.id === payload.new.id ? payload.new as Message : msg
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          console.log('Message deleted:', payload);
          setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, supabase, fetchMessages]);

  const addOptimisticMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const updateOptimisticMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  const removeOptimisticMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  return {
    messages,
    loading,
    error,
    channelName,
    serverName,
    addOptimisticMessage,
    updateOptimisticMessage,
    removeOptimisticMessage,
    refetch: fetchMessages,
  };
}

/**
 * Hook for typing indicators
 */
export function useTypingIndicator(channelId: string, userId: string) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!channelId || !userId) return;

    const channel = supabase
      .channel(`typing:${channelId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as TypingUser[];
        setTypingUsers(users.filter(user => user.user_id !== userId));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const newUsers = newPresences as TypingUser[];
        setTypingUsers(prev => [
          ...prev.filter(user => user.user_id !== newUsers[0]?.user_id),
          ...newUsers.filter(user => user.user_id !== userId)
        ]);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        const leftUsers = leftPresences as TypingUser[];
        setTypingUsers(prev => 
          prev.filter(user => !leftUsers.some(left => left.user_id === user.user_id))
        );
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            channel_id: channelId,
            username: 'User', // This should come from user context
            display_name: 'User',
            avatar_url: null,
            started_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, userId, supabase]);

  const startTyping = useCallback(() => {
    // Typing is automatically tracked by presence
  }, []);

  const stopTyping = useCallback(() => {
    // Typing is automatically tracked by presence
  }, []);

  return {
    typingUsers,
    startTyping,
    stopTyping,
  };
}
