import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getPublicEnv, getServerEnv } from '../env';

/**
 * Supabase client for server-side operations
 * This client is safe to use in Server Components, API routes, and server actions
 */
export async function createClient() {
  const cookieStore = await cookies();
  const env = getPublicEnv();
  
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Supabase admin client for server-side operations requiring elevated privileges
 * This client uses the service role key and bypasses RLS
 * Use with extreme caution - only for admin operations
 */
export function createAdminClient() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();
  
  return createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // No-op for admin client
        },
      },
    }
  );
}

// Note: Default client instance is not exported as createClient is now async
// Use createClient() directly in your server components and API routes
