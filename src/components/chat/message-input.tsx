'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sendMessage } from '@/lib/chat/actions';
import { Paperclip, Smile, Send } from 'lucide-react';
import type { Message } from '@/lib/chat/types';

interface MessageInputProps {
  channelId: string;
  onMessageSent?: (message: Message) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

export function MessageInput({ 
  channelId, 
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
    <div className="border-t border-border p-4">
      {error && (
        <div className="mb-2 text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        
        <Input
          ref={inputRef}
          value={content}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelId}`}
          className="flex-1"
          disabled={isLoading}
          maxLength={2000}
        />
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
        >
          <Smile className="h-4 w-4" />
        </Button>
        
        <Button
          type="submit"
          size="icon"
          disabled={!content.trim() || isLoading}
          className="h-8 w-8"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
      
      {content.length > 1800 && (
        <div className="mt-1 text-xs text-muted-foreground text-right">
          {content.length}/2000
        </div>
      )}
    </div>
  );
}
