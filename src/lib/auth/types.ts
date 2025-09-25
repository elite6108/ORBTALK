import type { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  status: 'online' | 'away' | 'busy' | 'offline';
  last_seen: string;
  created_at: string;
  updated_at: string;
  is_admin: boolean;
  is_moderator: boolean;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  banned_by: string | null;
  message_count: number;
  last_message_at: string | null;
}

export interface AuthUser extends User {
  profile?: UserProfile;
}

export interface SignUpData {
  email: string;
  password: string;
  username: string;
  display_name?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface UpdateProfileData {
  username?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
}

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthState {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  error: AuthError | null;
}
