'use client';

import { useState, FormEvent } from 'react';
import { useDmMessages } from '@/lib/dm/hooks';

export function DmThreadClient({ threadId, currentUserId }: { threadId: string; currentUserId: string }) {
  const { messages, loading, setMessages } = useDmMessages(threadId);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    setContent('');

    // optimistic append
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        thread_id: threadId,
        sender_id: currentUserId,
        content: text,
        content_type: 'text',
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any,
    ]);

    setSending(true);
    try {
      const res = await fetch('/api/dms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, content: text }),
      });
      if (!res.ok) {
        // rollback
        setMessages((prev) => prev.filter((m: any) => m.id !== tempId));
      }
    } catch {
      setMessages((prev) => prev.filter((m: any) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="text-gray-500">Loading…</div>
          ) : (messages ?? []).slice().reverse().map((m: any) => {
              const isMe = m.sender_id === currentUserId;
              const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={m.id} className={`group mb-1 flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-3 py-2 rounded-lg text-sm leading-6 ${isMe ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-gray-200 text-gray-900 rounded-bl-sm'}`}>
                    <div className="text-xs opacity-70 mb-0.5">{time}</div>
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  </div>
                </div>
              );
            })}
          {(!messages || messages.length === 0) && !loading && <div className="text-gray-500">No messages yet.</div>}
        </div>
      </div>
      <form onSubmit={onSubmit} className="border-t border-gray-200 p-4 flex gap-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Message"
          className="flex-1 rounded border border-gray-300 px-3 py-2"
        />
        <button disabled={sending || !content.trim()} className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
          Send
        </button>
      </form>
    </>
  );
}





