import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    const admin = createAdminClient();
    const { data: friendships, error: fErr } = await admin
      .from('friendships')
      .select('friend_id')
      .eq('user_id', user.id);
    if (fErr) return NextResponse.json({ error: 'Failed to load friends' }, { status: 500 });

    const friendIds = (friendships ?? []).map((r: any) => r.friend_id);
    if (friendIds.length === 0) return NextResponse.json({ friends: [] });

    const { data: users, error: uErr } = await admin
      .from('users')
      .select('id, username, display_name, avatar_url')
      .in('id', friendIds);
    if (uErr) return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });

    return NextResponse.json({ friends: users ?? [] });
  } catch {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}


