import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    const form = await req.formData();
    const serverId = String(form.get('serverId') || '').trim();
    if (!serverId) return NextResponse.json({ error: 'Missing serverId' }, { status: 400 });

    const admin = createAdminClient();
    // disallow owners from leaving via this endpoint
    const { data: member } = await admin
      .from('server_members')
      .select('role')
      .eq('server_id', serverId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 404 });
    if ((member as any).role === 'owner') return NextResponse.json({ error: 'Owners cannot leave their own server' }, { status: 400 });

    const { error } = await admin
      .from('server_members')
      .delete()
      .eq('server_id', serverId)
      .eq('user_id', user.id);
    if (error) return NextResponse.json({ error: 'Failed to leave' }, { status: 500 });

    return NextResponse.redirect(new URL('/servers', req.url));
  } catch {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
