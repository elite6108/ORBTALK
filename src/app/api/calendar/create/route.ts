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
    const { title, description, event_type, start_time, end_time, location, all_day, server_id, channel_id, attendees } = body;

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!start_time) {
      return NextResponse.json({ error: 'Start time is required' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: event, error } = await admin
      .from('calendar_events')
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        event_type: event_type || 'meeting',
        start_time,
        end_time: end_time || null,
        location: location?.trim() || null,
        all_day: all_day || false,
        server_id: server_id || null,
        channel_id: channel_id || null,
        attendees: attendees || []
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating calendar event:', error);
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Unexpected error creating event:', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
