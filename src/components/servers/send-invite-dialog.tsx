'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Friend {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface SendInviteDialogProps {
  serverId: string;
  inviteCode: string;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SendInviteDialog({ serverId, inviteCode, children, open: controlledOpen, onOpenChange }: SendInviteDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = typeof controlledOpen === 'boolean';
  const open = isControlled ? (controlledOpen as boolean) : uncontrolledOpen;
  const setOpen = isControlled && onOpenChange ? onOpenChange : setUncontrolledOpen;
  const [friends, setFriends] = useState<Friend[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return friends;
    return friends.filter((f) => (f.display_name || f.username).toLowerCase().includes(s));
  }, [q, friends]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      try {
        const res = await fetch('/api/friends/list');
        const data = await res.json();
        setFriends(data.friends || []);
      } catch {
        setFriends([]);
      }
    };
    load();
  }, [open]);

  const sendInvite = async (userId: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const link = `${window.location.origin}/invite/${inviteCode}`;
      const text = `Join my server: ${link}`;
      const res = await fetch('/api/dms/send-to-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, content: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Failed to send invite.');
      } else {
        setMessage('Invite sent!');
      }
    } catch {
      setMessage('Failed to send invite.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Send Server Invite</DialogTitle>
          <DialogDescription>Choose friends to DM an invite link.</DialogDescription>
        </DialogHeader>
        {message && (
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-3">
          <Input placeholder="Filter friends" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="max-h-72 overflow-y-auto space-y-2">
            {filtered.length === 0 ? (
              <div className="text-sm text-gray-500">No friends found.</div>
            ) : (
              filtered.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded border border-gray-200 bg-white p-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={f.avatar_url || ''} alt={f.display_name || f.username} />
                      <AvatarFallback>{(f.display_name || f.username).slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="truncate">
                      <div className="text-sm font-medium truncate">{f.display_name || f.username}</div>
                      <div className="text-xs text-gray-500 truncate">@{f.username}</div>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => sendInvite(f.id)} disabled={loading}>Send</Button>
                </div>
              ))
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


