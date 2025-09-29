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
    let list: Array<{ identity?: string; muted?: boolean; name?: string }> = [];
    try {
      list = await client.listParticipants(roomName);
    } catch (err: any) {
      // If the LiveKit room does not exist yet, quietly return empty participants (no error spam)
      if (err?.status === 404 || err?.code === 'not_found') {
        return NextResponse.json({ participants: [] });
      }
      throw err;
    }

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

    const participants = list.map((p) => {
      const identity = p.identity || '';
      return {
        id: identity,
        name: (identity ? nameById[identity] : undefined) || p.name || identity,
        audioEnabled: !p.muted,
      };
    });
    return NextResponse.json({ participants });
  } catch (error) {
    // Log non-404 errors once to aid debugging, but do not block UI
    console.error('LiveKit participants endpoint error:', error);
    return NextResponse.json({ participants: [] });
  }
}


