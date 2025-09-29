import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const admin = createAdminClient();

    // Verify user is a member of the server
    const { data: membership } = await admin
      .from('server_members')
      .select('id')
      .eq('server_id', serverId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this server' }, { status: 403 });
    }

    // Fetch all members with user details using explicit foreign key relationship
    const { data: members, error } = await admin
      .from('server_members')
      .select(`
        id,
        user_id,
        role,
        joined_at,
        users!server_members_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          status
        )
      `)
      .eq('server_id', serverId)
      .order('role', { ascending: true })
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Error fetching members:', error);
      return NextResponse.json({ error: 'Failed to fetch members', details: error.message }, { status: 500 });
    }

    // Transform the data to match expected format
    const transformedMembers = (members || []).map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      user: m.users
    }));

    return NextResponse.json({ members: transformedMembers });
  } catch (error) {
    console.error('Unexpected error fetching members:', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
