'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { deleteChannel } from '@/lib/servers/actions';

interface DeleteChannelButtonProps {
  channelId: string;
  serverId: string;
  onDeleted?: () => void;
}

export function DeleteChannelButton({ channelId, serverId, onDeleted }: DeleteChannelButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirm('Delete this channel?')) return;
    setLoading(true);
    setError(null);
    const { error } = await deleteChannel(channelId);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    onDeleted?.();
  };

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <Button variant="ghost" size="icon" onClick={handleDelete} disabled={loading} title="Delete channel">
        🗑️
      </Button>
    </div>
  );
}


