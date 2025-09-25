'use client';

import { Button } from '@/components/ui/button';
import { Smile } from 'lucide-react';

interface MessageReactionsProps {
  reactions: Record<string, string[]>;
  messageId: string;
  currentUserId: string;
}

export function MessageReactions({ reactions, messageId, currentUserId }: MessageReactionsProps) {
  const handleReaction = (emoji: string) => {
    // This will be implemented with the reaction action
    console.log('React with:', emoji, 'to message:', messageId);
  };

  const hasReacted = (emoji: string) => {
    return reactions[emoji]?.includes(currentUserId) || false;
  };

  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(reactions).map(([emoji, userIds]) => (
        <Button
          key={emoji}
          size="sm"
          variant={hasReacted(emoji) ? "default" : "outline"}
          className="h-6 px-2 text-xs"
          onClick={() => handleReaction(emoji)}
        >
          <span className="mr-1">{emoji}</span>
          <span>{userIds.length}</span>
        </Button>
      ))}
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0"
        onClick={() => {/* Open emoji picker */}}
      >
        <Smile className="h-3 w-3" />
      </Button>
    </div>
  );
}
