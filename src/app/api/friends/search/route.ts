import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    if (!q) return NextResponse.json({ users: [] });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('users')
      .select('id, username, display_name, avatar_url')
      .ilike('username', `%${q}%`)
      .limit(20);
    if (error) return NextResponse.json({ error: 'Failed to search users.' }, { status: 500 });
    return NextResponse.json({ users: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}


