'use server';

import { createClient, createAdminClient } from '../supabase/server';
import { getCurrentUserAction } from '../auth/server-actions';
import type { DmThread, DmMessage } from './types';
import type { UserBasic } from '../friends/types';

// Ensure a 1:1 thread exists between current user and target, returning thread id
export async function ensureDirectThread(targetUserId: string): Promise<{ error: string | null; threadId?: string }>{
  try {
    const userData = await getCurrentUserAction();
    if (!userData) return { error: 'Not signed in.' };
    const me = userData.user.id;
    if (me === targetUserId) return { error: 'Cannot DM yourself.' };

    const admin = createAdminClient();

    // Find existing thread that both participate in and is not group
    const { data: myThreads } = await admin
      .from('dm_participants')
      .select('thread_id')
      .eq('user_id', me);
    const threadIds = (myThreads ?? []).map((r: any) => r.thread_id);

    if (threadIds.length) {
      const { data: shared } = await admin
        .from('dm_participants')
        .select('thread_id')
        .in('thread_id', threadIds)
        .eq('user_id', targetUserId)
        .limit(1);
      if (shared && shared.length) return { error: null, threadId: shared[0].thread_id };
    }

    // Create a new thread and add both participants
    const { data: threadRow, error: tErr } = await admin
      .from('dm_threads')
      .insert({ is_group: false })
      .select('id')
      .single();
    if (tErr || !threadRow) return { error: 'Failed to create thread.' };

    const { error: pErr } = await admin
      .from('dm_participants')
      .insert([
        { thread_id: threadRow.id, user_id: me },
        { thread_id: threadRow.id, user_id: targetUserId },
      ]);
    if (pErr) return { error: 'Failed to add participants.' };
    return { error: null, threadId: threadRow.id };
  } catch (e) {
    return { error: 'Unexpected error creating thread.' };
  }
}

export async function listMyThreads(): Promise<{ error: string | null; threads?: Array<DmThread & { otherUserId?: string; otherUser?: UserBasic }> }>{
  try {
    const userData = await getCurrentUserAction();
    if (!userData) return { error: 'Not signed in.' };
    const me = userData.user.id;
    const admin = createAdminClient();

    const { data: rows, error } = await admin
      .from('dm_threads')
      .select('id, is_group, last_message_at, created_at, updated_at, participants:dm_participants(user_id)')
      .order('last_message_at', { ascending: false, nullsFirst: false });
    if (error) return { error: 'Failed to load threads.' };

    const myThreads = (rows ?? []).filter((t: any) => (t.participants ?? []).some((p: any) => p.user_id === me));
    const mapped = myThreads.map((t: any) => ({
      id: t.id,
      is_group: t.is_group,
      last_message_at: t.last_message_at,
      created_at: t.created_at,
      updated_at: t.updated_at,
      otherUserId: !t.is_group ? (t.participants ?? []).find((p: any) => p.user_id !== me)?.user_id : undefined,
    }));
    const otherIds = Array.from(new Set(mapped.map((t: any) => t.otherUserId).filter(Boolean)));
    let usersMap = new Map<string, UserBasic>();
    if (otherIds.length) {
      const { data: users } = await admin
        .from('users')
        .select('id, username, display_name, avatar_url')
        .in('id', otherIds);
      (users ?? []).forEach((u: any) => {
        usersMap.set(u.id, u as UserBasic);
      });
    }
    const enriched = mapped.map((t: any) => ({ ...t, otherUser: t.otherUserId ? usersMap.get(t.otherUserId) : undefined }));
    return { error: null, threads: enriched };
  } catch (e) {
    return { error: 'Unexpected error loading threads.' };
  }
}

export async function getThreadMessages(threadId: string, limit = 50, offset = 0): Promise<{ error: string | null; messages?: Array<DmMessage & { sender?: UserBasic }>; otherUser?: UserBasic }>{
  try {
    const userData = await getCurrentUserAction();
    if (!userData) return { error: 'Not signed in.' };
    const me = userData.user.id;
    const admin = createAdminClient();

    // Validate participant
    const { data: part, error: pErr } = await admin
      .from('dm_participants')
      .select('id')
      .eq('thread_id', threadId)
      .eq('user_id', me)
      .single();
    if (pErr || !part) return { error: 'Not authorized for thread.' };

    // Find other participant for header
    const { data: parts } = await admin
      .from('dm_participants')
      .select('user_id')
      .eq('thread_id', threadId);
    let otherUser: UserBasic | undefined = undefined;
    const otherId = (parts ?? []).find((p: any) => p.user_id !== me)?.user_id;
    if (otherId) {
      const { data: u } = await admin
        .from('users')
        .select('id, username, display_name, avatar_url')
        .eq('id', otherId)
        .single();
      if (u) otherUser = u as UserBasic;
    }

    const { data, error } = await admin
      .from('dm_messages')
      .select(`
        *,
        sender:users!dm_messages_sender_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('thread_id', threadId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) return { error: 'Failed to load messages.' };
    return { error: null, messages: (data ?? []) as unknown as Array<DmMessage & { sender?: UserBasic }>, otherUser };
  } catch (e) {
    return { error: 'Unexpected error loading messages.' };
  }
}

export async function sendDmMessage(threadId: string, content: string): Promise<{ error: string | null; message?: DmMessage }>{
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not signed in.' };
    const admin = createAdminClient();
    const trimmed = content.trim();
    if (!trimmed) return { error: 'Empty message.' };

    // Validate participant
    const { data: part, error: pErr } = await admin
      .from('dm_participants')
      .select('id')
      .eq('thread_id', threadId)
      .eq('user_id', user.id)
      .single();
    if (pErr || !part) return { error: 'Not authorized for thread.' };

    const { data: row, error } = await admin
      .from('dm_messages')
      .insert({ thread_id: threadId, sender_id: user.id, content: trimmed, content_type: 'text' })
      .select('*')
      .single();
    if (error || !row) return { error: 'Failed to send.' };

    await admin
      .from('dm_threads')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', threadId);

    return { error: null, message: row as unknown as DmMessage };
  } catch (e) {
    return { error: 'Unexpected error sending message.' };
  }
}


