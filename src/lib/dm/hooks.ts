'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getThreadMessages } from './actions';
import type { DmMessage } from './types';
import type { UserBasic } from '@/lib/friends/types';

export function useDmMessages(threadId: string) {
  const [messages, setMessages] = useState<Array<DmMessage & { sender?: UserBasic }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { error: err, messages } = await getThreadMessages(threadId, 50, 0);
      if (err) {
        setError(err);
        return;
      }
      setMessages(messages || []);
    } catch (e) {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    if (!threadId) return;
    fetchMessages();

    const channel = supabase
      .channel(`dm_messages:${threadId}`, { config: { broadcast: { ack: true }, presence: { key: threadId } } })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `thread_id=eq.${threadId}` },
        () => {
          // Re-fetch to include joined sender info
          fetchMessages();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'dm_messages', filter: `thread_id=eq.${threadId}` },
        () => fetchMessages()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'dm_messages', filter: `thread_id=eq.${threadId}` },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, supabase, fetchMessages]);

  return { messages, loading, error, refetch: fetchMessages, setMessages };
}


