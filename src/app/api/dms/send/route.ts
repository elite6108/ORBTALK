import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const threadId: string = String(body?.threadId || '');
    const content: string = String(body?.content || '');
    if (!threadId || !content.trim()) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    const admin = createAdminClient();
    const { data: part, error: pErr } = await admin
      .from('dm_participants')
      .select('id')
      .eq('thread_id', threadId)
      .eq('user_id', user.id)
      .single();
    if (pErr || !part) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const { data: row, error } = await admin
      .from('dm_messages')
      .insert({ thread_id: threadId, sender_id: user.id, content: content.trim(), content_type: 'text' })
      .select('id')
      .single();
    if (error || !row) return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}




