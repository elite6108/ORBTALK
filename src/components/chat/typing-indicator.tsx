'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import type { TypingUser } from '@/lib/chat/types';

interface TypingIndicatorProps {
  users: TypingUser[];
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].display_name || users[0].username} is typing...`;
    } else if (users.length === 2) {
      return `${users[0].display_name || users[0].username} and ${users[1].display_name || users[1].username} are typing...`;
    } else {
      return `${users.length} people are typing...`;
    }
  };

  return (
    <div className="flex items-center space-x-2 p-2 text-sm text-muted-foreground">
      <div className="flex -space-x-1">
        {users.slice(0, 3).map((user) => (
          <Avatar key={user.user_id} className="h-6 w-6 border-2 border-background">
            <AvatarImage src={user.avatar_url || ''} alt={user.display_name || user.username} />
            <AvatarFallback className="text-xs">
              {getInitials(user.display_name || user.username)}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      <span className="italic">{getTypingText()}</span>
      <div className="flex space-x-1">
        <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
