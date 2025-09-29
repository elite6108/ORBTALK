'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { VoiceDock } from '@/components/voice/voice-dock';

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

export function DmSidebar({ initialThreads }: { initialThreads?: Thread[] }) {
  const [threads, setThreads] = useState<Thread[]>(initialThreads ?? []);
  const [loading, setLoading] = useState(!initialThreads);

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
    if (!initialThreads) {
      load();
    }
  }, [initialThreads]);

  return (
    <div className="w-60 bg-[#2b2d31] text-[#f2f3f5] flex flex-col border-r border-black/20">
      <div className="h-12 border-b border-black/30 flex items-center px-4 shadow-md font-semibold">Direct Messages</div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-[#949ba4]">Loading…</div>
        ) : threads.length === 0 ? (
          <div className="p-4 text-[#949ba4]">No conversations yet</div>
        ) : (
          <div className="py-2">
            {threads.map((t) => (
              <Link key={t.id} href={`/dms/${t.id}`} className="flex items-center gap-2 px-3 py-2 hover:bg-[#404249] rounded mx-2">
                <div className="h-8 w-8 rounded-full bg-[#5865f2]" />
                <div className="min-w-0">
                  <div className="truncate text-[#f2f3f5]">{t.otherUser?.display_name ?? t.otherUser?.username ?? 'Direct Message'}</div>
                  {t.otherUser?.username && <div className="text-xs text-[#949ba4] truncate">@{t.otherUser.username}</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      
      {/* Voice Dock - above user info (would go here in full DM sidebar) */}
      <VoiceDock />
    </div>
  );
}





