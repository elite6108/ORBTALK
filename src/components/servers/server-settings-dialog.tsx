'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { updateServer } from '@/lib/servers/actions';

interface ServerSettingsDialogProps {
  serverId: string;
  serverName: string;
  serverIconUrl?: string | null;
  trigger: React.ReactNode;
}

export function ServerSettingsDialog({ serverId, serverName, serverIconUrl, trigger }: ServerSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(serverName);
  const [iconUrl, setIconUrl] = useState(serverIconUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await updateServer(serverId, { name, icon_url: iconUrl || null });
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Server Settings</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave} className="space-y-4">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label>Icon URL</Label>
            <Input value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link className="text-sm text-indigo-600 hover:underline" href={`/servers/${serverId}/roles`}>Manage Roles</Link>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}




