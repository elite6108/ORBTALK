'use client';

import { useEffect, useRef } from 'react';
import { MessageItem } from './message-item';
import { TypingIndicator } from './typing-indicator';
import type { Message, TypingUser } from '@/lib/chat/types';

interface MessageListProps {
  messages: Message[];
  typingUsers: TypingUser[];
  currentUserId: string;
  loading?: boolean;
  onDeleteMessage?: (id: string) => void;
}

export function MessageList({ messages, typingUsers, currentUserId, loading, onDeleteMessage }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <div className="text-lg font-semibold mb-2">No messages yet</div>
            <div className="text-sm">Be the first to send a message!</div>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isOwn={message.user_id === currentUserId}
              onDelete={onDeleteMessage}
            />
          ))}
          {typingUsers.length > 0 && (
            <TypingIndicator users={typingUsers} />
          )}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}
