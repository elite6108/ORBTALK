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
  const [isSecure, setIsSecure] = useState(true); // Assume secure by default to avoid hydration mismatch

  // Check secure context on mount (client-side only)
  useEffect(() => {
    setIsSecure(window.isSecureContext);
  }, []);

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
    <div className="border-t border-black/30 bg-[#1e1f22] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3ba55d] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3ba55d]"></span>
            </div>
            <div className="text-[10px] uppercase font-semibold text-[#3ba55d] tracking-wide">Voice Connected</div>
          </div>
          <div className="text-sm font-medium text-[#f2f3f5] truncate">
            {session.channelName ?? session.roomName}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            size="sm" 
            variant="ghost" 
            className={`h-8 w-8 transition-colors ${
              micMuted 
                ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' 
                : 'text-[#b5bac1] hover:text-[#dbdee1] hover:bg-[#35373c]'
            }`}
            onClick={() => setMicMuted((m) => !m)} 
            title={micMuted ? 'Unmute' : 'Mute'}
          >
            {micMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button 
            size="sm" 
            className="h-8 px-3 bg-[#da373c] hover:bg-[#a12d30] text-white text-xs font-medium"
            onClick={() => { (window as any).orbtalkVoiceLeave(); }}
          >
            <PhoneOff className="h-3.5 w-3.5 mr-1.5" /> 
            Disconnect
          </Button>
        </div>
      </div>

      {/* Keep connection mounted - use roomName as key to prevent unnecessary reconnects */}
      <div className="hidden">
        {isSecure ? (
          <LiveKitRoom 
            key={session.roomName}
            serverUrl={session.url} 
            token={session.token} 
            connect 
            audio={true}
            video={false}
            onConnected={() => {
              setConnected(true);
              console.log('Voice connected to room:', session.roomName);
            }} 
            onDisconnected={() => {
              setConnected(false);
              console.log('Voice disconnected from room:', session.roomName);
            }}
          >
            <RoomAudioRenderer />
            <MicStateController muted={micMuted} />
          </LiveKitRoom>
        ) : (
          <div className="text-xs text-red-400 p-2">
            Voice chat requires HTTPS or localhost. Please access via localhost.
          </div>
        )}
      </div>
    </div>
  );
}

function MicStateController({ muted }: { muted: boolean }) {
  const room = useRoomContext();
  
  useEffect(() => {
    // Check if we're in a secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
      console.warn('Microphone control unavailable: Not in secure context (requires HTTPS or localhost)');
      return;
    }
    
    if (!room || !room.localParticipant) return;
    
    // Wait for room to be fully connected
    if (room.state !== 'connected') return;
    
    const setMicState = async () => {
      try {
        const localParticipant = room.localParticipant;
        if (!localParticipant) return;
        
        // Set microphone enabled state (enabled = !muted)
        await localParticipant.setMicrophoneEnabled(!muted);
        
        console.log(`Microphone ${!muted ? 'enabled' : 'disabled'}`);
      } catch (error) {
        // Silently ignore errors during mic state changes
        console.debug('Microphone state change skipped:', error);
      }
    };
    
    // Small delay to ensure room is fully initialized
    const timeout = setTimeout(setMicState, 100);
    return () => clearTimeout(timeout);
  }, [room, muted]);
  
  return null;
}


