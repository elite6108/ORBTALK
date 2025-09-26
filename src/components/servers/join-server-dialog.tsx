'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Loader2, KeyRound } from 'lucide-react';

export function JoinServerDialog({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/servers/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to join server');
      } else {
        setOpen(false);
        setInviteCode('');
        router.push(`/servers/${data.serverId}/channels/${data.channelId}`);
      }
    } catch (e) {
      setError('Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="w-full justify-start">
            <KeyRound className="mr-2 h-4 w-4" />
            Join a Server
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Join a Server
          </DialogTitle>
          <DialogDescription>Enter an invite code to join a server.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="invite">Invite Code</Label>
            <Input id="invite" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="e.g. 1a2b3c4d5e" required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !inviteCode.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Join
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
