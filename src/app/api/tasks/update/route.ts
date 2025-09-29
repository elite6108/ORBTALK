import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const body = await req.json();
    const { task_id, status, title, description, priority, due_date } = body;

    if (!task_id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify the task belongs to the user
    const { data: existingTask } = await admin
      .from('tasks')
      .select('id, user_id, assigned_to')
      .eq('id', task_id)
      .single();

    if (!existingTask || (existingTask.user_id !== user.id && existingTask.assigned_to !== user.id)) {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 403 });
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (status !== undefined) {
      updates.status = status;
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      } else {
        updates.completed_at = null;
      }
    }

    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (priority !== undefined) updates.priority = priority;
    if (due_date !== undefined) updates.due_date = due_date;

    const { data: task, error } = await admin
      .from('tasks')
      .update(updates)
      .eq('id', task_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Unexpected error updating task:', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
