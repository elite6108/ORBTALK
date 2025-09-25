'use client';

import { Button } from '@/components/ui/button';
import { Edit, Trash2, Reply, Copy, Flag } from 'lucide-react';

interface MessageActionsProps {
  messageId: string;
  isOwn: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onReply?: () => void;
}

export function MessageActions({ 
  messageId, 
  isOwn, 
  onEdit, 
  onDelete, 
  onReply 
}: MessageActionsProps) {
  const handleCopy = () => {
    // This will copy the message content to clipboard
    console.log('Copy message:', messageId);
  };

  const handleReport = () => {
    // This will open a report dialog
    console.log('Report message:', messageId);
  };

  return (
    <div className="flex space-x-1">
      {isOwn && (
        <>
          {onEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onEdit}
              className="h-6 w-6 p-0"
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="h-6 w-6 p-0"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </>
      )}
      
      {onReply && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onReply}
          className="h-6 w-6 p-0"
        >
          <Reply className="h-3 w-3" />
        </Button>
      )}
      
      <Button
        size="sm"
        variant="ghost"
        onClick={handleCopy}
        className="h-6 w-6 p-0"
      >
        <Copy className="h-3 w-3" />
      </Button>
      
      {!isOwn && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleReport}
          className="h-6 w-6 p-0"
        >
          <Flag className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
