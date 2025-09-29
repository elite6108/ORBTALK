import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error || !data) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    return NextResponse.json({ profile: data });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}





