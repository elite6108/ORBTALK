import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const admin = createAdminClient();

    const suffix = Date.now().toString().slice(-6);
    const email = `friend+${suffix}@orbtalk.dev`;
    const password = 'OrbTalkTest!234';
    const username = `friend_${suffix}`;
    const display_name = `Friend ${suffix}`;

    // Create auth user (confirmed)
    const { data: created, error: createErr } = await (admin as any).auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, display_name },
    });
    if (createErr || !created?.user?.id) {
      return NextResponse.json({ error: 'Failed to create auth user.' }, { status: 500 });
    }

    const authId = created.user.id as string;

    // Ensure profile row exists in public.users
    const { error: upErr } = await admin
      .from('users')
      .upsert({
        id: authId,
        username,
        display_name,
        avatar_url: null,
        bio: null,
        status: 'online',
      }, { onConflict: 'id' });
    if (upErr) {
      return NextResponse.json({ error: 'Failed to create profile row.' }, { status: 500 });
    }

    return NextResponse.json({ email, password });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}


