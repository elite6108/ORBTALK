'use server';

import { createClient, createAdminClient } from '../supabase/server';
import type { UserProfile } from './types';

/**
 * Server action to get user profile with admin privileges
 * This bypasses RLS issues during development
 */
export async function getUserProfileAction(userId: string): Promise<UserProfile | null> {
  try {
    const adminSupabase = createAdminClient();
    
    const { data, error } = await adminSupabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile with admin client:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error in getUserProfileAction:', error);
    return null;
  }
}

/**
 * Server action to get current user with profile
 */
export async function getCurrentUserAction(): Promise<{ user: any; profile: UserProfile | null } | null> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    const profile = await getUserProfileAction(user.id);
    
    return {
      user,
      profile,
    };
  } catch (error) {
    console.error('Unexpected error in getCurrentUserAction:', error);
    return null;
  }
}
