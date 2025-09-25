'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { joinServer } from '@/lib/servers/actions';
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
import { Loader2, Users, Hash } from 'lucide-react';

export function JoinServerDialog() {
  const [open, setOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: joinError, server } = await joinServer({
      invite_code: inviteCode,
    });

    if (joinError) {
      setError(joinError);
    } else if (server) {
      // Reset form
      setInviteCode('');
      setOpen(false);
      
      // Navigate to the server - get the first channel ID
      const { getFirstChannel } = await import('@/lib/servers/actions');
      const { error: channelError, channelId } = await getFirstChannel(server.id);
      if (!channelError && channelId) {
        router.push(`/servers/${server.id}/channels/${channelId}`);
      } else {
        console.error('Failed to get first channel for navigation:', channelError);
        // Fallback to servers page if we can't get the channel
        router.push('/servers');
      }
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Users className="mr-2 h-4 w-4" />
          Join Server
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Join a Server
          </DialogTitle>
          <DialogDescription>
            Enter an invite code to join an existing server.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="invite-code">Invite Code *</Label>
            <Input
              id="invite-code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="ABC12345"
              required
              maxLength={8}
              className="font-mono text-center text-lg tracking-wider"
            />
            <p className="text-xs text-muted-foreground">
              Ask a server admin for the invite code
            </p>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !inviteCode.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Join Server
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
