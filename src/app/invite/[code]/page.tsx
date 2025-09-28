'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params?.code;
  const [message, setMessage] = useState('Joining server…');

  useEffect(() => {
    const join = async () => {
      try {
        const res = await fetch('/api/servers/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteCode: code }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessage(data.error || 'Failed to join invite.');
          return;
        }
        router.replace(`/servers/${data.serverId}/channels/${data.channelId}`);
      } catch {
        setMessage('Unexpected error joining server.');
      }
    };
    if (code) join();
  }, [code, router]);

  return (
    <div className="h-screen w-screen flex items-center justify-center text-sm text-gray-700">{message}</div>
  );
}


