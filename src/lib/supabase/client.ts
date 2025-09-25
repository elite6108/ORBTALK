import { createBrowserClient } from '@supabase/ssr';
import { getPublicEnv } from '../env';

/**
 * Supabase client for browser-side operations
 * This client is safe to use in React components and client-side code
 */
export function createClient() {
  const env = getPublicEnv();
  
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Export a default client instance
export const supabase = createClient();
