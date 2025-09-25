'use server';

import { createClient, createAdminClient } from '../supabase/server';
import { getCurrentUserAction } from '../auth/server-actions';
import { revalidatePath } from 'next/cache';
import type { CreateServerData, CreateChannelData, JoinServerData, Server, Channel } from './types';

/**
 * Create a new server
 */
export async function createServer(data: CreateServerData): Promise<{ error: string | null; server?: Server }> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { error: 'You must be signed in to create a server.' };
    }

    // Validate input
    if (!data.name.trim()) {
      return { error: 'Server name is required.' };
    }

    if (data.name.length > 100) {
      return { error: 'Server name is too long. Maximum 100 characters.' };
    }

    // Generate unique invite code
    const inviteCode = generateInviteCode();

    // Create server using admin client to bypass RLS
    const adminSupabase = createAdminClient();
    const { data: server, error: insertError } = await adminSupabase
      .from('servers')
      .insert({
        name: data.name.trim(),
        description: data.description?.trim() || null,
        icon_url: data.icon_url || null,
        invite_code: inviteCode,
        owner_id: user.id,
        is_verified: false,
        member_count: 1,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating server:', insertError);
      return { error: 'Failed to create server. Please try again.' };
    }

    // Add owner as server member using admin client to bypass RLS
    const { error: memberError } = await adminSupabase
      .from('server_members')
      .insert({
        server_id: server.id,
        user_id: user.id,
        role: 'owner',
      });

    if (memberError) {
      console.error('Error adding owner as member:', memberError);
      // Server was created but member wasn't added - this is a critical error
      return { error: 'Server created but failed to add you as a member. Please contact support.' };
    }

    // Create default channels - this is mandatory
    const defaultChannels = [
      { name: 'general', type: 'text' as const, description: 'General discussion' },
      { name: 'announcements', type: 'text' as const, description: 'Server announcements' },
      { name: 'voice-chat', type: 'voice' as const, description: 'General voice chat' },
    ];

    const createdChannels = [];
    for (let i = 0; i < defaultChannels.length; i++) {
      const channel = defaultChannels[i];
      const { data: channelData, error: channelError } = await adminSupabase
        .from('channels')
        .insert({
          server_id: server.id,
          name: channel.name,
          type: channel.type,
          description: channel.description,
          position: i,
          is_private: false,
        })
        .select('id')
        .single();

      if (channelError) {
        console.error('Error creating default channel:', channelError);
        // If channel creation fails, we need to clean up the server and fail
        await adminSupabase.from('servers').delete().eq('id', server.id);
        return { error: `Failed to create channel "${channel.name}". Server creation aborted.` };
      } else {
        console.log(`Created channel ${channel.name} with ID:`, channelData?.id);
        createdChannels.push(channelData);
      }
    }

    // Verify at least one channel was created
    if (createdChannels.length === 0) {
      console.error('No channels were created for server:', server.id);
      await adminSupabase.from('servers').delete().eq('id', server.id);
      return { error: 'Failed to create any channels. Server creation aborted.' };
    }

    revalidatePath('/servers');
    revalidatePath('/dashboard');
    
    return { error: null, server };
  } catch (error) {
    console.error('Unexpected error creating server:', error);
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}

/**
 * Join a server using invite code
 */
export async function joinServer(data: JoinServerData): Promise<{ error: string | null; server?: Server }> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { error: 'You must be signed in to join a server.' };
    }

    // Validate input
    if (!data.invite_code.trim()) {
      return { error: 'Invite code is required.' };
    }

    // Find server by invite code
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .select('*')
      .eq('invite_code', data.invite_code.trim())
      .single();

    if (serverError || !server) {
      return { error: 'Invalid invite code.' };
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('server_members')
      .select('id')
      .eq('server_id', server.id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      return { error: 'You are already a member of this server.' };
    }

    // Add user as server member using admin client to bypass RLS
    const adminSupabase = createAdminClient();
    const { error: memberError } = await adminSupabase
      .from('server_members')
      .insert({
        server_id: server.id,
        user_id: user.id,
        role: 'member',
      });

    if (memberError) {
      console.error('Error joining server:', memberError);
      return { error: 'Failed to join server. Please try again.' };
    }

    // Update server member count
    await supabase
      .from('servers')
      .update({ 
        member_count: supabase.rpc('increment', { 
          table_name: 'servers', 
          column_name: 'member_count',
          id: server.id 
        })
      })
      .eq('id', server.id);

    revalidatePath('/servers');
    revalidatePath('/dashboard');
    
    return { error: null, server };
  } catch (error) {
    console.error('Unexpected error joining server:', error);
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}

/**
 * Leave a server
 */
export async function leaveServer(serverId: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { error: 'You must be signed in to leave a server.' };
    }

    // Check if user is a member
    const { data: member, error: memberError } = await supabase
      .from('server_members')
      .select('role')
      .eq('server_id', serverId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return { error: 'You are not a member of this server.' };
    }

    // Check if user is the owner
    if (member.role === 'owner') {
      return { error: 'Server owners cannot leave their server. Transfer ownership or delete the server instead.' };
    }

    // Remove user from server
    const { error: leaveError } = await supabase
      .from('server_members')
      .delete()
      .eq('server_id', serverId)
      .eq('user_id', user.id);

    if (leaveError) {
      console.error('Error leaving server:', leaveError);
      return { error: 'Failed to leave server. Please try again.' };
    }

    // Update server member count
    await supabase
      .from('servers')
      .update({ 
        member_count: supabase.rpc('decrement', { 
          table_name: 'servers', 
          column_name: 'member_count',
          id: serverId 
        })
      })
      .eq('id', serverId);

    revalidatePath('/servers');
    revalidatePath('/dashboard');
    
    return { error: null };
  } catch (error) {
    console.error('Unexpected error leaving server:', error);
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}

/**
 * Create a new channel in a server
 */
export async function createChannel(data: CreateChannelData): Promise<{ error: string | null; channel?: Channel }> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { error: 'You must be signed in to create a channel.' };
    }

    // Validate input
    if (!data.name.trim()) {
      return { error: 'Channel name is required.' };
    }

    if (data.name.length > 50) {
      return { error: 'Channel name is too long. Maximum 50 characters.' };
    }

    // Check if user has permission to create channels (admin, moderator, or owner)
    const { data: member, error: memberError } = await supabase
      .from('server_members')
      .select('role')
      .eq('server_id', data.server_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return { error: 'You are not a member of this server.' };
    }

    if (!['owner', 'admin', 'moderator'].includes(member.role)) {
      return { error: 'You do not have permission to create channels.' };
    }

    // Get next position
    const { data: lastChannel } = await supabase
      .from('channels')
      .select('position')
      .eq('server_id', data.server_id)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (lastChannel?.position || -1) + 1;

    // Create channel
    const { data: channel, error: insertError } = await supabase
      .from('channels')
      .insert({
        server_id: data.server_id,
        name: data.name.trim(),
        type: data.type,
        description: data.description?.trim() || null,
        position: nextPosition,
        is_private: data.is_private || false,
        message_count: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating channel:', insertError);
      return { error: 'Failed to create channel. Please try again.' };
    }

    revalidatePath(`/servers/${data.server_id}`);
    
    return { error: null, channel };
  } catch (error) {
    console.error('Unexpected error creating channel:', error);
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}

/**
 * Get user's servers
 */
export async function getUserServers(): Promise<{ error: string | null; servers?: Server[] }> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { error: 'You must be signed in to view servers.' };
    }

    // Use admin client to bypass RLS for server fetching
    const adminSupabase = createAdminClient();

    // Get all servers and filter by user membership
    const { data: allServers, error: allServersError } = await adminSupabase
      .from('servers')
      .select('*')
      .order('created_at', { ascending: false });

    if (allServersError) {
      console.error('Error fetching all servers:', allServersError);
      return { error: 'Failed to fetch servers.' };
    }

    // Get user's memberships using admin client
    const { data: memberships, error: membershipsError } = await adminSupabase
      .from('server_members')
      .select('server_id, role')
      .eq('user_id', user.id);

    if (membershipsError) {
      console.error('Error fetching user memberships:', membershipsError);
      return { error: 'Failed to fetch server memberships.' };
    }

    // Filter servers where user is a member
    const userServerIds = memberships?.map(m => m.server_id) || [];
    const userServers = allServers?.filter(server => userServerIds.includes(server.id)) || [];

    return { error: null, servers: userServers };
  } catch (error) {
    console.error('Unexpected error fetching user servers:', error);
    return { error: 'An unexpected error occurred while fetching servers.' };
  }
}

/**
 * Get the first channel of a server
 */
export async function getFirstChannel(serverId: string): Promise<{ error: string | null; channelId?: string }> {
  try {
    const adminSupabase = createAdminClient();
    
    const { data: channels, error } = await adminSupabase
      .from('channels')
      .select('id')
      .eq('server_id', serverId)
      .order('position', { ascending: true })
      .limit(1);

    if (error) {
      console.error('Error fetching first channel:', error);
      return { error: 'Failed to fetch channel.' };
    }

    if (!channels || channels.length === 0) {
      console.error('No channels found for server:', serverId);
      return { error: 'No channels found for this server.' };
    }

    return { error: null, channelId: channels[0].id };
  } catch (error) {
    console.error('Unexpected error fetching first channel:', error);
    return { error: 'An unexpected error occurred while fetching channel.' };
  }
}

/**
 * Get channels for a server
 */
export async function getServerChannels(serverId: string): Promise<{ error: string | null; channels?: Channel[] }> {
  try {
    const userData = await getCurrentUserAction();
    if (!userData) {
      return { error: 'You must be signed in to view channels.' };
    }

    // Use admin client to bypass RLS for channel fetching
    const adminSupabase = createAdminClient();

    const { data: channels, error } = await adminSupabase
      .from('channels')
      .select('id, server_id, name')
      .eq('server_id', serverId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching channels:', error);
      return { error: 'Failed to fetch channels.' };
    }

    return { error: null, channels: channels || [] };
  } catch (error) {
    console.error('Unexpected error fetching channels:', error);
    return { error: 'An unexpected error occurred while fetching channels.' };
  }
}

/**
 * Generate a unique invite code
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
