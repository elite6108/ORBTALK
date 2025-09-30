import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '../env';

/**
 * Supabase client for browser-side operations
 * This client is safe to use in React components and client-side code
 */
export function createClient() {
  return createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Export a default client instance
export const supabase = createClient();
