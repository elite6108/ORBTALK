import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    const admin = createAdminClient();
    const { data: rows, error } = await admin
      .from('dm_threads')
      .select('id, is_group, last_message_at, created_at, updated_at, participants:dm_participants(user_id)')
      .order('last_message_at', { ascending: false, nullsFirst: false });
    if (error) return NextResponse.json({ error: 'Failed to load threads' }, { status: 500 });

    const myThreads = (rows ?? []).filter((t: any) => (t.participants ?? []).some((p: any) => p.user_id === user.id));
    const mapped = myThreads.map((t: any) => ({
      id: t.id,
      is_group: t.is_group,
      last_message_at: t.last_message_at,
      created_at: t.created_at,
      updated_at: t.updated_at,
      otherUserId: !t.is_group ? (t.participants ?? []).find((p: any) => p.user_id !== user.id)?.user_id : undefined,
    }));
    const otherIds = Array.from(new Set(mapped.map((t: any) => t.otherUserId).filter(Boolean)));
    let usersMap = new Map<string, any>();
    if (otherIds.length) {
      const { data: users } = await admin
        .from('users')
        .select('id, username, display_name, avatar_url')
        .in('id', otherIds);
      (users ?? []).forEach((u: any) => usersMap.set(u.id, u));
    }
    const enriched = mapped.map((t: any) => ({ ...t, otherUser: t.otherUserId ? usersMap.get(t.otherUserId) : undefined }));
    return NextResponse.json({ threads: enriched });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}







