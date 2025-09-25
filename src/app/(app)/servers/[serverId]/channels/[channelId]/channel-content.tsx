'use client';

import { useChannelMessages, useTypingIndicator } from '@/lib/chat/hooks';
import { MessageList } from '@/components/chat/message-list';
import { MessageInput } from '@/components/chat/message-input';
import { Button } from '@/components/ui/button';
import { Phone, Video, Info } from 'lucide-react';
import type { AuthUser } from '@/lib/auth/types';

interface ChannelContentProps {
  serverId: string;
  channelId: string;
  user: AuthUser;
}

export function ChannelContent({ serverId, channelId, user }: ChannelContentProps) {
  const { messages, loading, error, channelName, serverName, addOptimisticMessage } = useChannelMessages(channelId);
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(channelId, user.id);

  const handleMessageSent = (message: any) => {
    if (message) {
      addOptimisticMessage(message);
    }
  };

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-red-600">
          <div className="text-lg font-semibold mb-2">Error loading messages</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Channel Header */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide text-gray-400">{serverName || 'Server'}</span>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">#</span>
            <span className="font-semibold text-gray-900 text-lg capitalize">{channelName || 'Channel'}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          typingUsers={typingUsers}
          currentUserId={user.id}
          loading={loading}
        />
      </div>
      
      {/* Message Input */}
      <div className="border-t border-gray-200 bg-white">
        <MessageInput
          channelId={channelId}
          channelName={channelName}
          onMessageSent={handleMessageSent}
          onTypingStart={startTyping}
          onTypingStop={stopTyping}
          currentUserId={user.id}
        />
      </div>
    </div>
  );
}