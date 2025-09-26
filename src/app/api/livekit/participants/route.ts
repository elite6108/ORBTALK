import { NextRequest, NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';
import { env } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/server';

function toHttpUrl(wsUrl: string): string {
  try {
    const u = new URL(wsUrl);
    if (u.protocol.startsWith('ws')) {
      u.protocol = u.protocol === 'wss:' ? 'https:' : 'http:';
    }
    return u.toString();
  } catch {
    // fallback assume already https
    return wsUrl;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { serverId, channelId } = await req.json();
    if (!serverId || !channelId) {
      return NextResponse.json({ error: 'Missing serverId or channelId' }, { status: 400 });
    }
    const roomName = `${serverId}:${channelId}`;
    const baseUrl = toHttpUrl(env.LIVEKIT_URL);

    const client = new RoomServiceClient(baseUrl, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
    const list = await client.listParticipants(roomName);

    // Map LiveKit identities -> user profile names
    const identities = list.map((p) => p.identity).filter(Boolean);
    const admin = createAdminClient();
    let nameById: Record<string, string> = {};
    if (identities.length > 0) {
      const { data: rows } = await admin
        .from('users')
        .select('id, display_name, username')
        .in('id', identities);
      rows?.forEach((r: any) => {
        nameById[r.id] = r.display_name || r.username || r.id;
      });
    }

    const participants = list.map((p) => ({
      id: p.identity,
      name: nameById[p.identity] || p.name || p.identity,
      audioEnabled: !p.muted,
    }));
    return NextResponse.json({ participants });
  } catch (error) {
    console.error('LiveKit list participants error:', error);
    return NextResponse.json({ participants: [] });
  }
}


