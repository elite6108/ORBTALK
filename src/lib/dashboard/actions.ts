'use server';

import { createClient, createAdminClient } from '../supabase/server';
import { getCurrentUserAction } from '../auth/server-actions';

export async function getDashboardStats() {
  try {
    const userData = await getCurrentUserAction();
    if (!userData) {
      return { error: 'Not authenticated' };
    }

    const admin = createAdminClient();
    const userId = userData.user.id;

    // Get unread message count across all servers
    const { data: serverMembers } = await admin
      .from('server_members')
      .select('server_id')
      .eq('user_id', userId);

    const serverIds = (serverMembers || []).map(m => m.server_id);

    let unreadCount = 0;
    if (serverIds.length > 0) {
      const { count } = await admin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('server_id', serverIds)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      unreadCount = count || 0;
    }

    // Get total team members across servers
    let totalMembers = 0;
    if (serverIds.length > 0) {
      const { count } = await admin
        .from('server_members')
        .select('*', { count: 'exact', head: true })
        .in('server_id', serverIds);
      
      totalMembers = count || 0;
    }

    // Get online members (active in last 10 minutes)
    let onlineMembers = 0;
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: onlineCount } = await admin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'online')
      .gte('last_seen', tenMinutesAgo);
    
    onlineMembers = onlineCount || 0;

    // Get today's focus time (in hours)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const { data: focusSessions } = await admin
      .from('user_activity_sessions')
      .select('duration_minutes')
      .eq('user_id', userId)
      .eq('session_type', 'focus')
      .gte('started_at', todayStart.toISOString());

    const focusMinutes = (focusSessions || []).reduce((sum, session) => sum + (session.duration_minutes || 0), 0);
    const focusHours = (focusMinutes / 60).toFixed(1);

    return {
      error: null,
      stats: {
        unreadMessages: unreadCount,
        channelCount: serverIds.length,
        teamMembers: totalMembers,
        onlineMembers,
        focusTime: `${focusHours} hrs`
      }
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return { error: 'Failed to fetch dashboard stats' };
  }
}

export async function getUserTasks() {
  try {
    const userData = await getCurrentUserAction();
    if (!userData) {
      return { error: 'Not authenticated' };
    }

    const admin = createAdminClient();
    
    const { data: tasks, error } = await admin
      .from('tasks')
      .select(`
        *,
        assigned_to_user:users!tasks_assigned_to_fkey(username, display_name),
        assigned_by_user:users!tasks_assigned_by_fkey(username, display_name)
      `)
      .or(`user_id.eq.${userData.user.id},assigned_to.eq.${userData.user.id}`)
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching tasks:', error);
      return { error: 'Failed to fetch tasks' };
    }

    return { error: null, tasks: tasks || [] };
  } catch (error) {
    console.error('Unexpected error fetching tasks:', error);
    return { error: 'Failed to fetch tasks' };
  }
}

export async function getRecentActivity() {
  try {
    const userData = await getCurrentUserAction();
    if (!userData) {
      return { error: 'Not authenticated' };
    }

    const admin = createAdminClient();
    const userId = userData.user.id;

    // Get user's servers
    const { data: serverMembers } = await admin
      .from('server_members')
      .select('server_id')
      .eq('user_id', userId);

    const serverIds = (serverMembers || []).map(m => m.server_id);

    if (serverIds.length === 0) {
      return { error: null, activities: [] };
    }

    // Get recent messages from user's servers
    const { data: messages } = await admin
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        user_id,
        channel_id,
        users!messages_user_id_fkey(username, display_name),
        channels(name, type, server_id, servers(name))
      `)
      .in('server_id', serverIds)
      .order('created_at', { ascending: false })
      .limit(10);

    const activities = (messages || []).map((msg: any) => ({
      id: msg.id,
      type: 'message',
      title: `New message in #${msg.channels?.name || 'channel'}`,
      description: msg.content?.substring(0, 100),
      time: msg.created_at,
      channelName: msg.channels?.name,
      serverName: msg.channels?.servers?.name,
      userName: msg.users?.display_name || msg.users?.username
    }));

    return { error: null, activities };
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return { error: 'Failed to fetch activity' };
  }
}
