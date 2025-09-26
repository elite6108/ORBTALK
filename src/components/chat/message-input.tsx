'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sendMessage } from '@/lib/chat/actions';
import { Paperclip, Smile, Send } from 'lucide-react';
import type { Message } from '@/lib/chat/types';

interface MessageInputProps {
  channelId: string;
  channelName?: string;
  currentUserId?: string;
  onMessageSent?: (message: Message) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

export function MessageInput({ 
  channelId, 
  channelName,
  currentUserId,
  onMessageSent, 
  onTypingStart, 
  onTypingStop 
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || isLoading) return;

    const messageContent = content.trim();
    setContent('');
    setIsLoading(true);
    setError(null);

    // Stop typing indicator
    if (onTypingStop) {
      onTypingStop();
    }

    try {
      const { error: sendError, message } = await sendMessage({
        channel_id: channelId,
        content: messageContent,
      });

      if (sendError) {
        setError(sendError);
        setContent(messageContent); // Restore content on error
      } else if (message && onMessageSent) {
        onMessageSent(message);
      }
    } catch (err) {
      console.error('Unexpected error sending message:', err);
      setError('An unexpected error occurred');
      setContent(messageContent); // Restore content on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setContent(value);

    // Handle typing indicators
    if (value.length > 0 && onTypingStart) {
      onTypingStart();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    if (value.length > 0 && onTypingStop) {
      typingTimeoutRef.current = setTimeout(() => {
        onTypingStop();
      }, 2000); // Stop typing after 2 seconds of inactivity
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="border-t border-gray-200 bg-white px-6 py-3">
      {error && (
        <div className="mb-2 text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
      
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 shadow"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full text-gray-500 hover:text-gray-700"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        
        <Input
          ref={inputRef}
          value={content}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName || channelId}`}
          className="flex-1 border-0 px-1 py-0 text-sm shadow-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          disabled={isLoading}
          maxLength={2000}
        />
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full text-gray-500 hover:text-gray-700"
        >
          <Smile className="h-4 w-4" />
        </Button>
        
        <Button
          type="submit"
          size="icon"
          disabled={!content.trim() || isLoading}
          className="h-9 w-9 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
      
    </div>
  );
}
