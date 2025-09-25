'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createServer } from '@/lib/servers/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Loader2, Plus, Server } from 'lucide-react';

interface CreateServerDialogProps {
  children?: React.ReactNode;
  onServerCreated?: () => void;
}

export function CreateServerDialog({ children, onServerCreated }: CreateServerDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: createError, server } = await createServer({
      name,
      description: description || undefined,
      icon_url: iconUrl || undefined,
    });

      if (createError) {
        setError(createError);
      } else if (server) {
        // Reset form
        setName('');
        setDescription('');
        setIconUrl('');
        setOpen(false);

        // Call the refresh callback if provided
        if (onServerCreated) {
          onServerCreated();
        }

        // Navigate to the new server - get the first channel ID
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
        {children || (
          <Button variant="outline" className="w-full justify-start">
            <Plus className="mr-2 h-4 w-4" />
            Create Server
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Create New Server
          </DialogTitle>
          <DialogDescription>
            Create a new server to start chatting with friends and communities.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name">Server Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Server"
              required
              maxLength={100}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this server about?"
              rows={3}
              maxLength={500}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="icon-url">Icon URL (Optional)</Label>
            <Input
              id="icon-url"
              type="url"
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              placeholder="https://example.com/icon.png"
            />
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
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Server
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
