import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const targetUserId: string = String(body?.targetUserId || '').trim();
    const content: string = String(body?.content || '').trim();
    if (!targetUserId || !content) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    if (user.id === targetUserId) return NextResponse.json({ error: 'Cannot DM yourself' }, { status: 400 });

    const admin = createAdminClient();

    // Ensure 1:1 thread exists between current user and target
    const { data: myThreads } = await admin
      .from('dm_participants')
      .select('thread_id')
      .eq('user_id', user.id);
    const threadIds = (myThreads ?? []).map((r: any) => r.thread_id);
    let threadId: string | null = null;
    if (threadIds.length) {
      const { data: shared } = await admin
        .from('dm_participants')
        .select('thread_id')
        .in('thread_id', threadIds)
        .eq('user_id', targetUserId)
        .limit(1);
      if (shared && shared.length) threadId = shared[0].thread_id;
    }

    if (!threadId) {
      const { data: threadRow, error: tErr } = await admin
        .from('dm_threads')
        .insert({ is_group: false })
        .select('id')
        .single();
      if (tErr || !threadRow) return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 });
      threadId = threadRow.id;
      const { error: pErr } = await admin
        .from('dm_participants')
        .insert([
          { thread_id: threadId, user_id: user.id },
          { thread_id: threadId, user_id: targetUserId },
        ]);
      if (pErr) return NextResponse.json({ error: 'Failed to add participants' }, { status: 500 });
    }

    const { error: mErr } = await admin
      .from('dm_messages')
      .insert({ thread_id: threadId, sender_id: user.id, content, content_type: 'text' });
    if (mErr) return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
    await admin
      .from('dm_threads')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', threadId);
    return NextResponse.json({ ok: true, threadId });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}


