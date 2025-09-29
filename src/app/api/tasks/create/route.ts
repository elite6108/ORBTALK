import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, priority, due_date, server_id, channel_id, assigned_to } = body;

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: task, error } = await admin
      .from('tasks')
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || 'medium',
        status: 'pending',
        due_date: due_date || null,
        server_id: server_id || null,
        channel_id: channel_id || null,
        assigned_to: assigned_to || null,
        assigned_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Unexpected error creating task:', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
