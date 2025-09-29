'use client';

import { useState } from 'react';
// import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageActions } from './message-actions';
import { deleteMessage } from '@/lib/chat/actions';
import { MessageReactions } from './message-reactions';
import { getInitials } from '@/lib/utils';
import { MoreHorizontal, Edit, Trash2, Reply } from 'lucide-react';
import type { Message } from '@/lib/chat/types';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  onDelete?: (id: string) => void;
}

export function MessageItem({ message, isOwn, onDelete }: MessageItemProps) {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - messageTime.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(message.content);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleSaveEdit = async () => {
    // This will be implemented with the edit action
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteMessage(message.id);
  };

  return (
    <div
      className="group flex items-start space-x-3 hover:bg-[#2e3035] p-2 rounded transition-colors"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={message.user?.avatar_url || ''} alt={message.user?.display_name || message.user?.username || ''} />
        <AvatarFallback className="text-xs">
          {getInitials(message.user?.display_name || message.user?.username || 'U')}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline space-x-2 mb-1">
          <span className="font-semibold text-sm text-[#f2f3f5]">
            {message.user?.display_name || message.user?.username || 'Unknown User'}
          </span>
          <span className="text-xs text-[#949ba4]">
            {formatTimestamp(message.created_at)}
          </span>
          {message.edited_at && (
            <span className="text-xs text-[#949ba4]">
              (edited)
            </span>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2 border rounded-md resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex space-x-2">
              <Button size="sm" onClick={handleSaveEdit}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm whitespace-pre-wrap break-words text-[#dbdee1]">
              {message.content}
            </p>
            
            {message.reactions && Object.keys(message.reactions).length > 0 && (
              <MessageReactions 
                reactions={message.reactions} 
                messageId={message.id}
                currentUserId={message.user_id}
              />
            )}
          </div>
        )}
      </div>

      {showActions && isOwn && (
        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleEdit}
            className="h-6 w-6 p-0"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            className="h-6 w-6 p-0"
            title="Delete message"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {/* Implement reply */}}
            className="h-6 w-6 p-0"
          >
            <Reply className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
