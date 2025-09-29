'use client';

import { useEffect, useState } from 'react';
import { LiveKitRoom, AudioConference, useRoomContext } from '@livekit/components-react';
import '@livekit/components-styles/index.css';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';
import type { Participant } from 'livekit-client';
import { RoomEvent } from 'livekit-client';
import { Mic, MicOff } from 'lucide-react';

interface VoiceChannelContentProps {
  serverId: string;
  channelId: string;
}

export function VoiceChannelContent({ serverId, channelId }: VoiceChannelContentProps) {
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSecure, setIsSecure] = useState(true); // Assume secure by default to avoid hydration mismatch

  // Check secure context on mount (client-side only)
  useEffect(() => {
    setIsSecure(window.isSecureContext);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const join = async () => {
      try {
        const res = await fetch('/api/livekit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serverId, channelId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to get token');
        if (!cancelled) {
          setToken(data.token);
          setUrl(data.url);
          setRoomName(data.roomName);
          // publish to global voice dock so connection persists across navigation
          try {
            const session = { serverId, channelId, token: data.token, url: data.url, roomName: data.roomName, channelName: data.channelName };
            localStorage.setItem('orbtalk:voice:session', JSON.stringify(session));
            window.dispatchEvent(new Event('orbtalk:voice:updated'));
          } catch {}
        }
      } catch (e: any) {
        setError(e.message || 'Failed to join voice');
      }
    };
    join();
    return () => {
      cancelled = true;
    };
  }, [serverId, channelId]);

  if (error) {
    return (
      <div className="p-6 text-sm text-red-600">{error}</div>
    );
  }

  if (!token || !url || !roomName) {
    return (
      <div className="p-6 text-sm text-gray-500">Connecting to voice…</div>
    );
  }

  // Check for secure context (HTTPS or localhost)
  if (!isSecure) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 font-semibold mb-2">Voice Chat Unavailable</div>
        <div className="text-sm text-gray-600">
          Voice chat requires HTTPS or localhost access.
          <br />
          Please access the app via <code className="bg-gray-100 px-1 py-0.5 rounded">http://localhost</code>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom serverUrl={url} token={token} connect>
      <div className="p-2 border-b">
        <span className="text-sm text-gray-600">Connected</span>
      </div>
      {/* Compact strip under the header like Discord roster */}
      <div className="px-3 py-2 border-b bg-white/60">
        <ParticipantStrip />
      </div>
      {/* Main stage with tiles + controls */}
      <div className="grid grid-cols-1 gap-4 p-3">
        <div className="border rounded-md">
          <VoiceParticipants />
        </div>
        <div className="border rounded-md p-2">
          <AudioConference />
        </div>
      </div>
      <div className="p-2 border-t flex justify-end">
        <Button onClick={() => window.location.reload()}>Leave</Button>
      </div>
    </LiveKitRoom>
  );
}

function VoiceParticipants() {
  const room = useRoomContext();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [active, setActive] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!room) return;

    const recompute = () => {
      const remoteMap: Map<string, Participant> =
        // LiveKit versions expose either `participants` or `remoteParticipants`
        ((room as any).participants as Map<string, Participant>) ||
        ((room as any).remoteParticipants as Map<string, Participant>) ||
        new Map<string, Participant>();
      const remotes = Array.from(remoteMap.values());
      const locals = room.localParticipant ? [room.localParticipant] : [];
      setParticipants([...locals, ...remotes]);
    };

    recompute();

    const onJoin = () => recompute();
    const onLeave = () => recompute();
    const onActive = (speakers: Participant[]) => {
      setActive(new Set(speakers.map((p) => p.identity)));
    };

    room.on(RoomEvent.Connected, onJoin);
    room.on(RoomEvent.ParticipantConnected, onJoin);
    room.on(RoomEvent.ParticipantDisconnected, onLeave);
    room.on(RoomEvent.ActiveSpeakersChanged, onActive);

    return () => {
      room.off(RoomEvent.Connected, onJoin);
      room.off(RoomEvent.ParticipantConnected, onJoin);
      room.off(RoomEvent.ParticipantDisconnected, onLeave);
      room.off(RoomEvent.ActiveSpeakersChanged, onActive);
    };
  }, [room]);

  if (!room) {
    return <div className="p-3 text-xs text-gray-500">Connecting…</div>;
  }

  if (participants.length === 0) {
    return <div className="p-3 text-xs text-gray-500">No one here yet</div>;
  }

  return (
    <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
      {participants.map((p) => {
        const name = p.name || p.identity;
        const isSpeaking = active.has(p.identity);
        const isLocal = p.identity === room?.localParticipant?.identity;
        const micEnabled = (p as any).isMicrophoneEnabled ?? isSpeaking;
        return (
          <div key={p.identity} className="flex flex-col items-center">
            <div
              className={[
                'relative h-16 w-16 rounded-full flex items-center justify-center select-none',
                isSpeaking ? 'ring-4 ring-green-500 shadow-[0_0_0_6px_rgba(34,197,94,0.25)] transition-shadow' : 'ring-1 ring-gray-300',
              ].join(' ')}
            >
              <span className="text-sm font-medium">
                {name?.slice(0, 2)?.toUpperCase() || '??'}
              </span>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white border flex items-center justify-center">
                {micEnabled ? (
                  <Mic className="h-3.5 w-3.5 text-gray-700" />
                ) : (
                  <MicOff className="h-3.5 w-3.5 text-red-500" />
                )}
              </div>
            </div>
            <div className="mt-1 w-20 text-center truncate text-xs text-gray-700">
              {name}
              {isLocal ? ' (you)' : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ParticipantStrip() {
  const room = useRoomContext();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [active, setActive] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!room) return;
    const recompute = () => {
      const remoteMap:
        | Map<string, Participant>
        = ((room as any).participants as Map<string, Participant>) ||
          ((room as any).remoteParticipants as Map<string, Participant>) ||
          new Map<string, Participant>();
      const remotes = Array.from(remoteMap.values());
      const locals = room.localParticipant ? [room.localParticipant] : [];
      setParticipants([...locals, ...remotes]);
    };
    recompute();
    const onJoin = () => recompute();
    const onLeave = () => recompute();
    const onActive = (speakers: Participant[]) => setActive(new Set(speakers.map((p) => p.identity)));
    room.on(RoomEvent.Connected, onJoin);
    room.on(RoomEvent.ParticipantConnected, onJoin);
    room.on(RoomEvent.ParticipantDisconnected, onLeave);
    room.on(RoomEvent.ActiveSpeakersChanged, onActive);
    return () => {
      room.off(RoomEvent.Connected, onJoin);
      room.off(RoomEvent.ParticipantConnected, onJoin);
      room.off(RoomEvent.ParticipantDisconnected, onLeave);
      room.off(RoomEvent.ActiveSpeakersChanged, onActive);
    };
  }, [room]);

  if (!room || participants.length === 0) {
    return <div className="text-xs text-gray-500">No participants</div>;
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {participants.map((p) => {
        const name = p.name || p.identity;
        const isSpeaking = active.has(p.identity);
        return (
          <div key={p.identity} className="flex items-center gap-2 pr-2">
            <div
              className={[
                'h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold',
                isSpeaking ? 'ring-2 ring-green-500 shadow-[0_0_0_4px_rgba(34,197,94,0.25)]' : 'ring-1 ring-gray-300',
              ].join(' ')}
            >
              {name?.slice(0, 2)?.toUpperCase()}
            </div>
            <div className="text-xs text-gray-700 truncate max-w-[140px]">{name}</div>
          </div>
        );
      })}
    </div>
  );
}


