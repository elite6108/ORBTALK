import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { getCurrentUserAction } from '@/lib/auth/server-actions';
import { createAdminClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    const userData = await getCurrentUserAction();
    if (!userData) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { serverId, channelId } = await req.json();
    if (!serverId || !channelId) {
      return NextResponse.json({ error: 'Missing serverId or channelId' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Ensure channel exists and is voice
    const { data: channel, error: channelError } = await admin
      .from('channels')
      .select('id, server_id, type, name')
      .eq('id', channelId)
      .eq('server_id', serverId)
      .single();

    if (channelError || !channel || channel.type !== 'voice') {
      return NextResponse.json({ error: 'Invalid voice channel' }, { status: 400 });
    }

    // Check membership
    const { data: member, error: memberError } = await admin
      .from('server_members')
      .select('role')
      .eq('server_id', serverId)
      .eq('user_id', userData.user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Not a member of this server' }, { status: 403 });
    }

    const roomName = `${serverId}:${channelId}`;

    const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      identity: userData.user.id,
      ttl: '1h',
    });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    return NextResponse.json({ token, url: env.LIVEKIT_URL, roomName });
  } catch (error) {
    console.error('LiveKit token error:', error);
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
  }
}


