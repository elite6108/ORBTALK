'use client';

import { useDmMessages } from '@/lib/dm/hooks';

export function DmMessagesClient({ threadId, currentUserId }: { threadId: string; currentUserId: string }) {
  const { messages, loading, setMessages } = useDmMessages(threadId);
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-5xl mx-auto">
        {loading ? (
          <div className="text-gray-500">Loading…</div>
        ) : (messages ?? []).slice().reverse().map((m) => {
            const isMe = m.sender_id === currentUserId;
            const name = m.sender?.display_name ?? m.sender?.username ?? '';
            const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={m.id} className={`group mb-1 flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] px-3 py-2 rounded-lg text-sm leading-6 ${isMe ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-gray-200 text-gray-900 rounded-bl-sm'}`}>
                  <div className="text-xs opacity-70 mb-0.5">
                    {!isMe && name ? name : ''} {time}
                  </div>
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                </div>
              </div>
            );
          })}
        {(!messages || messages.length === 0) && !loading && <div className="text-gray-500">No messages yet.</div>}
      </div>
    </div>
  );
}


