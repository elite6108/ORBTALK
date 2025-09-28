'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type UserBasic = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type Thread = {
  id: string;
  otherUser?: UserBasic;
};

export function DmSidebar() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/dms/threads');
        const data = await res.json();
        setThreads(data.threads || []);
      } catch {
        setThreads([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="w-60 bg-gray-800 text-white flex flex-col">
      <div className="h-12 border-b border-gray-700 flex items-center px-4 shadow-sm font-semibold">Direct Messages</div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-gray-400">Loading…</div>
        ) : threads.length === 0 ? (
          <div className="p-4 text-gray-400">No conversations yet</div>
        ) : (
          <div className="py-2">
            {threads.map((t) => (
              <Link key={t.id} href={`/dms/${t.id}`} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700">
                <div className="h-8 w-8 rounded-full bg-gray-600" />
                <div className="min-w-0">
                  <div className="truncate">{t.otherUser?.display_name ?? t.otherUser?.username ?? 'Direct Message'}</div>
                  {t.otherUser?.username && <div className="text-xs text-gray-400 truncate">@{t.otherUser.username}</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}




