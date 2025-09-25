import { createClient } from '../supabase/server';
import type { UserProfile, AuthUser } from './types';

/**
 * Get the current user's profile from the database
 * This function is safe to use in Server Components and API routes
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      // Return a minimal profile if we can't fetch from database
      return {
        id: userId,
        username: 'user',
        display_name: 'User',
        avatar_url: null,
        bio: null,
        status: 'offline' as const,
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_admin: false,
        is_moderator: false,
        is_banned: false,
        ban_reason: null,
        banned_at: null,
        banned_by: null,
        message_count: 0,
        last_message_at: null,
      };
    }

    return data;
  } catch (error) {
    console.error('Unexpected error fetching user profile:', error);
    // Return a minimal profile as fallback
    return {
      id: userId,
      username: 'user',
      display_name: 'User',
      avatar_url: null,
      bio: null,
      status: 'offline' as const,
      last_seen: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_admin: false,
      is_moderator: false,
      is_banned: false,
      ban_reason: null,
      banned_at: null,
      banned_by: null,
      message_count: 0,
      last_message_at: null,
    };
  }
}

/**
 * Get the current authenticated user with their profile
 * This function is safe to use in Server Components and API routes
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  const profile = await getUserProfile(user.id);
  
  return {
    ...user,
    profile: profile || undefined,
  };
}

/**
 * Check if the current user is authenticated
 * This function is safe to use in Server Components and API routes
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Check if the current user is an admin
 * This function is safe to use in Server Components and API routes
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.profile?.is_admin ?? false;
}

/**
 * Check if the current user is banned
 * This function is safe to use in Server Components and API routes
 */
export async function isBanned(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.profile?.is_banned ?? false;
}

/**
 * Update user's last seen timestamp
 * This function is safe to use in Server Components and API routes
 */
export async function updateLastSeen(userId: string): Promise<void> {
  const supabase = await createClient();
  
  await supabase
    .from('users')
    .update({ last_seen: new Date().toISOString() })
    .eq('id', userId);
}

/**
 * Validate username format
 */
export function validateUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
  return usernameRegex.test(username);
}

/**
 * Generate a unique username from email
 */
export function generateUsernameFromEmail(email: string): string {
  const base = email.split('@')[0].toLowerCase();
  const clean = base.replace(/[^a-z0-9_-]/g, '');
  const timestamp = Date.now().toString().slice(-4);
  return `${clean}${timestamp}`.substring(0, 50);
}
