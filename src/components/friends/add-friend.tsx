'use client';

import { useState } from 'react';

interface UserBasic {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function AddFriend() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserBasic[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const search = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      setMessage('Search failed.');
    } finally {
      setLoading(false);
    }
  };

  const send = async (addresseeId: string) => {
    setMessage(null);
    try {
      const res = await fetch('/api/friends/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresseeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Failed to send request.');
      } else {
        setMessage('Request sent.');
      }
    } catch (e) {
      setMessage('Failed to send request.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search username"
          className="flex-1 rounded border border-gray-300 px-3 py-2"
        />
        <button
          onClick={search}
          disabled={loading}
          className="px-3 py-2 rounded bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:opacity-50"
        >{loading ? 'Searching…' : 'Search'}</button>
      </div>

      {message && <div className="text-sm text-gray-600">{message}</div>}

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between rounded border border-gray-200 bg-white p-3">
            <div>
              <div className="font-medium">{u.display_name ?? u.username}</div>
              <div className="text-xs text-gray-500">@{u.username}</div>
            </div>
            <button
              onClick={() => send(u.id)}
              className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
            >Add</button>
          </div>
        ))}
      </div>
    </div>
  );
}
