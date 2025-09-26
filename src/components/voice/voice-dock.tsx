'use client';

import { useEffect, useState } from 'react';
import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from '@livekit/components-react';
import '@livekit/components-styles/index.css';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, PhoneOff } from 'lucide-react';

type VoiceSession = {
  serverId: string;
  channelId: string;
  roomName: string;
  url: string;
  token: string;
  channelName?: string;
};

export function VoiceDock() {
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [connected, setConnected] = useState(false);
  const [micMuted, setMicMuted] = useState(false);

  // join helper so pages can programmatically connect
  useEffect(() => {
    (window as any).orbtalkVoiceJoin = (s: VoiceSession) => {
      localStorage.setItem('orbtalk:voice:session', JSON.stringify(s));
      setSession(s);
    };
    (window as any).orbtalkVoiceLeave = () => {
      localStorage.removeItem('orbtalk:voice:session');
      setSession(null);
    };

    // rehydrate existing session
    try {
      const raw = localStorage.getItem('orbtalk:voice:session');
      if (raw) setSession(JSON.parse(raw));
    } catch {}

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'orbtalk:voice:session') {
        try {
          if (e.newValue) setSession(JSON.parse(e.newValue));
          else setSession(null);
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    const onCustom = () => {
      try {
        const raw = localStorage.getItem('orbtalk:voice:session');
        if (raw) setSession(JSON.parse(raw));
      } catch {}
    };
    window.addEventListener('orbtalk:voice:updated' as any, onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('orbtalk:voice:updated' as any, onCustom);
    };
  }, []);

  if (!session) {
    return null;
  }

  return (
    <div className="mx-2 mb-2 rounded bg-gray-700 text-white p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-gray-300">Voice Connected</div>
          <div className="text-sm font-semibold truncate">{session.channelName ?? session.roomName}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-8 w-8" onClick={() => setMicMuted((m) => !m)} title={micMuted ? 'Unmute' : 'Mute'}>
            {micMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button size="sm" className="h-8" variant="destructive" onClick={() => { (window as any).orbtalkVoiceLeave(); }}>
            <PhoneOff className="h-4 w-4 mr-1" /> Leave
          </Button>
        </div>
      </div>

      {/* Keep connection mounted */}
      <div className="hidden">
        <LiveKitRoom serverUrl={session.url} token={session.token} connect audio captureAudio={!micMuted} onConnected={() => setConnected(true)} onDisconnected={() => setConnected(false)}>
          <RoomAudioRenderer />
          <MicStateController muted={micMuted} />
        </LiveKitRoom>
      </div>
    </div>
  );
}

function MicStateController({ muted }: { muted: boolean }) {
  const room = useRoomContext();
  useEffect(() => {
    if (!room) return;
    try {
      // toggle mic on the local participant without reconnecting
      room.localParticipant?.setMicrophoneEnabled(!muted);
    } catch {}
  }, [room, muted]);
  return null;
}


