'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '../supabase/client';
import type { User } from '@supabase/supabase-js';
import type { UserProfile, AuthState, AuthError } from './types';

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  error: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setError({ message: error.message, code: 'SESSION_ERROR' });
          return;
        }

        if (session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        }
      } catch (err) {
        setError({ message: 'Failed to get session', code: 'SESSION_ERROR' });
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (_userId: string) => {
    try {
      // Use server API to bypass RLS and ensure consistent profile load
      const res = await fetch('/api/profile', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        setError({ message: json.error || 'Failed to fetch user profile', code: 'PROFILE_FETCH_ERROR' });
        return;
      }
      setProfile(json.profile);
      setError(null);
    } catch (err) {
      setError({ message: 'Failed to fetch user profile', code: 'PROFILE_FETCH_ERROR' });
    }
  };

  const value: AuthState = {
    user,
    profile,
    loading,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
