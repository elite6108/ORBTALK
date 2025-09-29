'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ServerRole } from '@/lib/servers/types';
import { createServerRole, updateServerRole, deleteServerRole, assignRoleToUser, revokeRoleFromUser } from '@/lib/servers/actions';

const PERMISSIONS = [
  { key: 1, label: 'Manage Roles' },
  { key: 2, label: 'Manage Channels' },
  { key: 4, label: 'Kick Members' },
  { key: 8, label: 'Ban Members' },
  { key: 16, label: 'Manage Server' },
  { key: 32, label: 'Manage Messages' },
  { key: 64, label: 'Mention Everyone' },
  { key: 128, label: 'Manage Webhooks' },
  { key: 256, label: 'Manage Emojis' },
];

export function RolesManager({ serverId, initialRoles }: { serverId: string; initialRoles: ServerRole[] }) {
  const [roles, setRoles] = useState<ServerRole[]>(initialRoles);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const toggleBit = (current: number, bit: number) => (current & bit) ? (current & ~bit) : (current | bit);

  const onCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    const res = await createServerRole(serverId, { name: newName });
    setCreating(false);
    if (res.error || !res.role) { setError(res.error || 'Failed to create'); return; }
    setRoles(prev => [...prev, res.role!].sort((a,b) => a.position - b.position));
    setNewName('');
  };

  const onUpdate = async (role: ServerRole, update: Partial<ServerRole>) => {
    const res = await updateServerRole(serverId, role.id, update);
    if (res.error || !res.role) { setError(res.error || 'Failed to update'); return; }
    setRoles(prev => prev.map(r => r.id === role.id ? res.role! : r));
  };

  const onDelete = async (role: ServerRole) => {
    const res = await deleteServerRole(serverId, role.id);
    if (res.error) { setError(res.error); return; }
    setRoles(prev => prev.filter(r => r.id !== role.id));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Role</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={100} placeholder="e.g. Moderators" />
          </div>
          <Button onClick={onCreate} disabled={creating || !newName.trim()}>{creating ? 'Creating…' : 'Create Role'}</Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {roles.length === 0 && <div className="text-gray-500">No roles yet.</div>}
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Input className="w-64" value={role.name} onChange={(e) => setRoles(prev => prev.map(r => r.id === role.id ? { ...r, name: e.target.value } : r))} onBlur={() => onUpdate(role, { name: role.name })} />
                  <span className="text-xs text-gray-500">pos {role.position}</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm flex items-center gap-1">
                    <input type="checkbox" checked={role.hoist} onChange={() => onUpdate(role, { hoist: !role.hoist })} /> Hoist
                  </label>
                  <label className="text-sm flex items-center gap-1">
                    <input type="checkbox" checked={role.mentionable} onChange={() => onUpdate(role, { mentionable: !role.mentionable })} /> Mentionable
                  </label>
                  <Button variant="outline" onClick={() => onDelete(role)}>Delete</Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {PERMISSIONS.map((p) => (
                  <label key={p.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={(role.permissions & p.key) !== 0}
                      onChange={() => onUpdate(role, { permissions: toggleBit(role.permissions, p.key) })}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}




