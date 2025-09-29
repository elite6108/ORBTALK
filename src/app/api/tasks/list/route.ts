import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const admin = createAdminClient();
    
    const { data: tasks, error } = await admin
      .from('tasks')
      .select(`
        *,
        assigned_to_user:users!tasks_assigned_to_fkey(username, display_name),
        assigned_by_user:users!tasks_assigned_by_fkey(username, display_name)
      `)
      .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    return NextResponse.json({ tasks: tasks || [] });
  } catch (error) {
    console.error('Unexpected error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}
