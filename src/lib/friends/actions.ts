'use server';

import { createClient, createAdminClient } from '../supabase/server';
import { getCurrentUserAction } from '../auth/server-actions';
import type { FriendRequest, Friendship, UserBasic } from './types';

export async function searchUsers(query: string): Promise<{ error: string | null; users?: UserBasic[] }>{
  try {
    const admin = createAdminClient();
    const q = query.trim();
    if (!q) return { error: null, users: [] };

    const { data, error } = await admin
      .from('users')
      .select('id, username, display_name, avatar_url')
      .ilike('username', `%${q}%`)
      .limit(20);

    if (error) {
      return { error: 'Failed to search users.' };
    }
    return { error: null, users: data as unknown as UserBasic[] };
  } catch (e) {
    return { error: 'Unexpected error searching users.' };
  }
}

export async function sendFriendRequest(addresseeId: string): Promise<{ error: string | null }>{
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'You must be signed in.' };

    if (user.id === addresseeId) return { error: 'Cannot add yourself.' };

    const admin = createAdminClient();

    // Prevent duplicates in either direction
    const { data: existing } = await admin
      .from('friend_requests')
      .select('id, status')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`)
      .limit(1)
      .maybeSingle();

    if (existing && existing.status === 'pending') {
      return { error: 'Request already pending.' };
    }

    // If the other side already requested, accept both into friendships
    if (existing && existing.status === 'pending') {
      // no-op handled above
    }

    const { error: insertErr } = await admin
      .from('friend_requests')
      .insert({ requester_id: user.id, addressee_id: addresseeId, status: 'pending' });

    if (insertErr) return { error: 'Failed to send request.' };
    return { error: null };
  } catch (e) {
    return { error: 'Unexpected error sending request.' };
  }
}

export async function respondToFriendRequest(requestId: string, action: 'accept'|'decline'|'block'): Promise<{ error: string | null }>{
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'You must be signed in.' };

    const admin = createAdminClient();

    const { data: fr, error: frErr } = await admin
      .from('friend_requests')
      .select('id, requester_id, addressee_id, status')
      .eq('id', requestId)
      .single();

    if (frErr || !fr) return { error: 'Request not found.' };
    if (fr.addressee_id !== user.id && fr.requester_id !== user.id) return { error: 'Not authorized.' };
    if (fr.status !== 'pending' && action !== 'block') return { error: 'Already handled.' };

    if (action === 'accept') {
      const { error: upErr } = await admin
        .from('friend_requests')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', fr.id);
      if (upErr) return { error: 'Failed to accept.' };

      // Create bidirectional friendship rows
      const { error: fErr } = await admin
        .from('friendships')
        .insert([
          { user_id: fr.requester_id, friend_id: fr.addressee_id },
          { user_id: fr.addressee_id, friend_id: fr.requester_id },
        ]);
      if (fErr) return { error: 'Failed to create friendship.' };
      return { error: null };
    }

    if (action === 'decline') {
      const { error: upErr } = await admin
        .from('friend_requests')
        .update({ status: 'declined', responded_at: new Date().toISOString() })
        .eq('id', fr.id);
      return { error: upErr ? 'Failed to decline.' : null };
    }

    // block
    const { error: blkErr } = await admin
      .from('friend_requests')
      .update({ status: 'blocked', responded_at: new Date().toISOString() })
      .eq('id', fr.id);
    return { error: blkErr ? 'Failed to block.' : null };
  } catch (e) {
    return { error: 'Unexpected error responding to request.' };
  }
}

export async function getFriendOverview(): Promise<{
  error: string | null;
  friends?: UserBasic[];
  incoming?: (FriendRequest & { requester: UserBasic })[];
  outgoing?: (FriendRequest & { addressee: UserBasic })[];
}> {
  try {
    const userData = await getCurrentUserAction();
    if (!userData) return { error: 'Not signed in.' };

    const admin = createAdminClient();
    const userId = userData.user.id;

    // friends
    const { data: friendsRows } = await admin
      .from('friendships')
      .select('friend_id')
      .eq('user_id', userId);

    const friendIds = (friendsRows ?? []).map((r: any) => r.friend_id);
    let friends: UserBasic[] = [];
    if (friendIds.length) {
      const { data } = await admin
        .from('users')
        .select('id, username, display_name, avatar_url')
        .in('id', friendIds);
      friends = (data ?? []) as unknown as UserBasic[];
    }

    // incoming requests
    const { data: incoming } = await admin
      .from('friend_requests')
      .select('id, requester_id, addressee_id, status, created_at, responded_at')
      .eq('addressee_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    let incomingWithUsers: any[] = [];
    if (incoming && incoming.length) {
      const ids = Array.from(new Set(incoming.map((r: any) => r.requester_id)));
      const { data: users } = await admin
        .from('users')
        .select('id, username, display_name, avatar_url')
        .in('id', ids);
      const map = new Map((users ?? []).map((u: any) => [u.id, u]));
      incomingWithUsers = incoming.map((r: any) => ({ ...r, requester: map.get(r.requester_id) }));
    }

    // outgoing
    const { data: outgoing } = await admin
      .from('friend_requests')
      .select('id, requester_id, addressee_id, status, created_at, responded_at')
      .eq('requester_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    let outgoingWithUsers: any[] = [];
    if (outgoing && outgoing.length) {
      const ids = Array.from(new Set(outgoing.map((r: any) => r.addressee_id)));
      const { data: users } = await admin
        .from('users')
        .select('id, username, display_name, avatar_url')
        .in('id', ids);
      const map = new Map((users ?? []).map((u: any) => [u.id, u]));
      outgoingWithUsers = outgoing.map((r: any) => ({ ...r, addressee: map.get(r.addressee_id) }));
    }

    return { error: null, friends, incoming: incomingWithUsers, outgoing: outgoingWithUsers };
  } catch (e) {
    return { error: 'Unexpected error loading friends.' };
  }
}


