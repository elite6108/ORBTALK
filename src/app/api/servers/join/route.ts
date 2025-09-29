import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { inviteCode } = await req.json();
    const code = String(inviteCode || '').trim();
    if (!code) return NextResponse.json({ error: 'Missing invite code' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    const admin = createAdminClient();
    const { data: server, error: sErr } = await admin
      .from('servers')
      .select('id, invite_code')
      .eq('invite_code', code)
      .single();
    if (sErr || !server) return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 404 });

    // Upsert membership (member role)
    await admin
      .from('server_members')
      .upsert({ server_id: server.id, user_id: user.id, role: 'member' }, { onConflict: 'server_id,user_id' });

    // Find a first channel to route into
    const { data: channel } = await admin
      .from('channels')
      .select('id')
      .eq('server_id', server.id)
      .eq('type', 'text')
      .order('position', { ascending: true })
      .limit(1)
      .single();

    return NextResponse.json({ serverId: server.id, channelId: channel?.id ?? '' });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}







