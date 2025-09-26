import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const addresseeId = String(body?.addresseeId || '').trim();
    if (!addresseeId) return NextResponse.json({ error: 'Missing addresseeId' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    if (user.id === addresseeId) return NextResponse.json({ error: 'Cannot add yourself' }, { status: 400 });

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from('friend_requests')
      .select('id, status')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`)
      .limit(1)
      .maybeSingle();

    if (existing && existing.status === 'pending') {
      return NextResponse.json({ error: 'Request already pending' }, { status: 400 });
    }

    const { error: insertErr } = await admin
      .from('friend_requests')
      .insert({ requester_id: user.id, addressee_id: addresseeId, status: 'pending' });
    if (insertErr) return NextResponse.json({ error: 'Failed to send request' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}


