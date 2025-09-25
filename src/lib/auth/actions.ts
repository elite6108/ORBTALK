'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '../supabase/server';
import { validateUsername, generateUsernameFromEmail } from './utils';
import type { SignUpData, SignInData, UpdateProfileData, AuthError } from './types';

/**
 * Sign up a new user
 */
export async function signUp(data: SignUpData): Promise<{ error: AuthError | null }> {
  const supabase = await createClient();
  
  try {
    // Validate username
    if (!validateUsername(data.username)) {
      return {
        error: {
          message: 'Username must be 3-50 characters long and contain only letters, numbers, underscores, and hyphens.',
          code: 'INVALID_USERNAME',
        },
      };
    }

    // Check if username is already taken
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', data.username)
      .single();

    if (existingUser) {
      return {
        error: {
          message: 'Username is already taken.',
          code: 'USERNAME_TAKEN',
        },
      };
    }

    // Create the user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      return {
        error: {
          message: authError.message,
          code: authError.message.includes('email') ? 'EMAIL_ERROR' : 'AUTH_ERROR',
        },
      };
    }

    if (!authData.user) {
      return {
        error: {
          message: 'Failed to create user account.',
          code: 'USER_CREATION_FAILED',
        },
      };
    }

    // Create user profile using admin client to bypass RLS
    const adminSupabase = createAdminClient();
    const { error: profileError } = await adminSupabase
      .from('users')
      .insert({
        id: authData.user.id,
        username: data.username,
        display_name: data.display_name || data.username,
        status: 'offline',
      });

    if (profileError) {
      // If profile creation fails, we should clean up the auth user
      // This is a critical error that should be handled
      console.error('Failed to create user profile:', profileError);
      return {
        error: {
          message: 'Failed to create user profile. Please try again.',
          code: 'PROFILE_CREATION_FAILED',
        },
      };
    }

    return { error: null };
  } catch (error) {
    console.error('Sign up error:', error);
    return {
      error: {
        message: 'An unexpected error occurred. Please try again.',
        code: 'UNEXPECTED_ERROR',
      },
    };
  }
}

/**
 * Sign in a user
 */
export async function signIn(data: SignInData): Promise<{ error: AuthError | null }> {
  const supabase = await createClient();
  
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return {
        error: {
          message: error.message,
          code: error.message.includes('email') ? 'EMAIL_ERROR' : 'AUTH_ERROR',
        },
      };
    }

    return { error: null };
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      error: {
        message: 'An unexpected error occurred. Please try again.',
        code: 'UNEXPECTED_ERROR',
      },
    };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const supabase = await createClient();
  
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        error: {
          message: error.message,
          code: 'SIGNOUT_ERROR',
        },
      };
    }

    revalidatePath('/');
    return { error: null };
  } catch (error) {
    console.error('Sign out error:', error);
    return {
      error: {
        message: 'An unexpected error occurred. Please try again.',
        code: 'UNEXPECTED_ERROR',
      },
    };
  }
}

/**
 * Update user profile
 */
export async function updateProfile(data: UpdateProfileData): Promise<{ error: AuthError | null }> {
  const supabase = await createClient();
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        error: {
          message: 'You must be signed in to update your profile.',
          code: 'NOT_AUTHENTICATED',
        },
      };
    }

    // Validate username if provided
    if (data.username && !validateUsername(data.username)) {
      return {
        error: {
          message: 'Username must be 3-50 characters long and contain only letters, numbers, underscores, and hyphens.',
          code: 'INVALID_USERNAME',
        },
      };
    }

    // Check if username is already taken (if changing username)
    if (data.username) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', data.username)
        .neq('id', user.id)
        .single();

      if (existingUser) {
        return {
          error: {
            message: 'Username is already taken.',
            code: 'USERNAME_TAKEN',
          },
        };
      }
    }

    // Update the profile
    const { error: updateError } = await supabase
      .from('users')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      return {
        error: {
          message: 'Failed to update profile. Please try again.',
          code: 'UPDATE_FAILED',
        },
      };
    }

    revalidatePath('/');
    return { error: null };
  } catch (error) {
    console.error('Update profile error:', error);
    return {
      error: {
        message: 'An unexpected error occurred. Please try again.',
        code: 'UNEXPECTED_ERROR',
      },
    };
  }
}

/**
 * Create or update user profile on first login
 * This function is called when a user signs in for the first time
 */
export async function upsertUserProfile(userId: string, email: string): Promise<{ error: AuthError | null }> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  
  try {
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      // Profile exists, just update last_seen
      await supabase
        .from('users')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', userId);
      
      return { error: null };
    }

    // Generate a unique username from email
    let username = generateUsernameFromEmail(email);
    
    // Ensure username is unique
    let counter = 1;
    while (true) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (!existingUser) {
        break;
      }

      username = `${generateUsernameFromEmail(email)}${counter}`;
      counter++;
    }

    // Create the profile using admin client to bypass RLS
    const { error: insertError } = await adminSupabase
      .from('users')
      .insert({
        id: userId,
        username,
        display_name: username,
        status: 'offline',
        last_seen: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Failed to create user profile:', insertError);
      return {
        error: {
          message: 'Failed to create user profile. Please try again.',
          code: 'PROFILE_CREATION_FAILED',
        },
      };
    }

    return { error: null };
  } catch (error) {
    console.error('Upsert user profile error:', error);
    return {
      error: {
        message: 'An unexpected error occurred. Please try again.',
        code: 'UNEXPECTED_ERROR',
      },
    };
  }
}
