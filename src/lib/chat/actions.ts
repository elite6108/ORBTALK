'use server';

import { createClient, createAdminClient } from '../supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUserAction } from '../auth/server-actions';
import type { SendMessageData, Message } from './types';

/**
 * Send a message to a channel
 */
export async function sendMessage(data: SendMessageData): Promise<{ error: string | null; message?: Message }> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'You must be signed in to send messages.' };
    }

    // Validate input
    if (!data.content.trim()) {
      return { error: 'Message content cannot be empty.' };
    }

    if (data.content.length > 2000) {
      return { error: 'Message is too long. Maximum 2000 characters.' };
    }

    // Verify channel exists and get server
    const adminSupabase = createAdminClient();

    const { data: channel, error: channelError } = await adminSupabase
      .from('channels')
      .select('id, server_id')
      .eq('id', data.channel_id)
      .single();

    if (channelError || !channel) {
      console.error('Channel not found when sending message:', channelError);
      return { error: 'Channel not found.' };
    }

    // Ensure user is a member of the server
    const { data: membership, error: membershipError } = await adminSupabase
      .from('server_members')
      .select('id')
      .eq('server_id', channel.server_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      console.error('User is not a member of server when sending message:', membershipError);
      return { error: 'You are not a member of this server.' };
    }

    // Insert message using admin client to bypass RLS recursion
    const { data: message, error: insertError } = await adminSupabase
      .from('messages')
      .insert({
        channel_id: data.channel_id,
        user_id: user.id,
        content: data.content.trim(),
        parent_message_id: data.parent_message_id || null,
        content_type: 'text',
      })
      .select(`
        *,
        user:users!messages_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (insertError) {
      console.error('Error sending message:', insertError);
      return { error: 'Failed to send message. Please try again.' };
    }

    // Update channel's last_message_at
    await adminSupabase
      .from('channels')
      .update({ 
        last_message_at: new Date().toISOString(),
      })
      .eq('id', data.channel_id);

    revalidatePath(`/servers/${channel.server_id}/channels/${data.channel_id}`);

    return { error: null, message: message as Message };
  } catch (error) {
    console.error('Unexpected error sending message:', error);
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { error: 'You must be signed in to delete messages.' };
    }

    // Get the message to check ownership
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('user_id, channel_id, server_id')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) {
      return { error: 'Message not found.' };
    }

    // Check if user owns the message or is admin
    const { data: userProfile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (message.user_id !== user.id && !userProfile?.is_admin) {
      return { error: 'You can only delete your own messages.' };
    }

    // Soft delete the message
    const { error: deleteError } = await supabase
      .from('messages')
      .update({ 
        is_deleted: true,
        content: '[Message deleted]',
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId);

    if (deleteError) {
      console.error('Error deleting message:', deleteError);
      return { error: 'Failed to delete message. Please try again.' };
    }

    revalidatePath(`/servers/${message.server_id}/channels/${message.channel_id}`);
    
    return { error: null };
  } catch (error) {
    console.error('Unexpected error deleting message:', error);
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}

/**
 * Edit a message
 */
export async function editMessage(messageId: string, newContent: string): Promise<{ error: string | null; message?: Message }> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { error: 'You must be signed in to edit messages.' };
    }

    // Validate input
    if (!newContent.trim()) {
      return { error: 'Message content cannot be empty.' };
    }

    if (newContent.length > 2000) {
      return { error: 'Message is too long. Maximum 2000 characters.' };
    }

    // Get the message to check ownership
    const { data: existingMessage, error: fetchError } = await supabase
      .from('messages')
      .select('user_id, channel_id, server_id, created_at')
      .eq('id', messageId)
      .single();

    if (fetchError || !existingMessage) {
      return { error: 'Message not found.' };
    }

    // Check if user owns the message
    if (existingMessage.user_id !== user.id) {
      return { error: 'You can only edit your own messages.' };
    }

    // Check if message is within edit window (15 minutes)
    const messageAge = Date.now() - new Date(existingMessage.created_at).getTime();
    const editWindow = 15 * 60 * 1000; // 15 minutes in milliseconds

    if (messageAge > editWindow) {
      return { error: 'Message is too old to edit. Edit window is 15 minutes.' };
    }

    // Update the message
    const { data: message, error: updateError } = await supabase
      .from('messages')
      .update({ 
        content: newContent.trim(),
        is_edited: true,
        edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select(`
        *,
        user:users!messages_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (updateError) {
      console.error('Error editing message:', updateError);
      return { error: 'Failed to edit message. Please try again.' };
    }

    revalidatePath(`/servers/${existingMessage.server_id}/channels/${existingMessage.channel_id}`);
    
    return { error: null, message };
  } catch (error) {
    console.error('Unexpected error editing message:', error);
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}

/**
 * Get messages for a channel
 */
export async function getChannelMessages(
  channelId: string, 
  limit: number = 50, 
  offset: number = 0
): Promise<{ error: string | null; messages?: Message[] }> {
  try {
    // Get current user to verify authentication
    const userData = await getCurrentUserAction();
    if (!userData) {
      return { error: 'You must be signed in to view messages.' };
    }

    // Use admin client to bypass RLS for message fetching
    const adminSupabase = createAdminClient();
    
    // First, let's check if the channel exists
    const { data: channel, error: channelError } = await adminSupabase
      .from('channels')
      .select('id, name, server_id')
      .eq('id', channelId)
      .single();

    if (channelError) {
      console.error('Channel not found:', channelError);
      return { error: `Channel not found: ${channelError.message}` };
    }

    // Check if user is a member of the server
    const { data: membership, error: membershipError } = await adminSupabase
      .from('server_members')
      .select('role')
      .eq('server_id', channel.server_id)
      .eq('user_id', userData.user.id)
      .single();

    if (membershipError) {
      console.error('User not a member of server:', membershipError);
      return { error: 'You are not a member of this server.' };
    }
    
    const { data: messages, error } = await adminSupabase
      .from('messages')
      .select(`
        *,
        user:users!messages_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('channel_id', channelId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching messages:', error);
      return { error: `Failed to fetch messages: ${error.message}` };
    }

    return { error: null, messages: messages || [] };
  } catch (error) {
    console.error('Unexpected error fetching messages:', error);
    return { error: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}
