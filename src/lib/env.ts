import { z } from 'zod';

// Helper to check if we're on the server
const isServer = typeof window === 'undefined';

// Server-only environment variables
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  LIVEKIT_API_KEY: z.string().min(1, 'LIVEKIT_API_KEY is required'),
  LIVEKIT_API_SECRET: z.string().min(1, 'LIVEKIT_API_SECRET is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Public environment variables (exposed to client)
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
});

// Validate public environment variables (runs on both client and server)
const parsePublicEnv = (): z.infer<typeof publicEnvSchema> => {
  try {
    // Direct reference to process.env variables so Next.js can inline them at build time
    const source = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    };

    return publicEnvSchema.parse(source);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Public environment validation failed:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
};

// Validate server environment variables (only runs on server)
const parseServerEnv = (): z.infer<typeof serverEnvSchema> => {
  if (!isServer) {
    throw new Error('Server environment validation should only run on the server');
  }

  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const source = isProduction
      ? process.env
      : {
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here',
          LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY || 'APIqU9BiCrs5x46',
          LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET || '4n6O0ZGHJimsQfp648HyF1eJfUsNA7xXqpMvIW7WmqoA',
          NODE_ENV: process.env.NODE_ENV || 'development',
        };

    return serverEnvSchema.parse(source);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Server environment validation failed:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
};

// Export validated public environment variables (safe for client)
export const publicEnv = parsePublicEnv();

// Lazy-loaded server environment (only validated when accessed on server)
let serverEnvCache: z.infer<typeof serverEnvSchema> | null = null;
export const getServerEnv = (): z.infer<typeof serverEnvSchema> => {
  if (!isServer) {
    throw new Error('Server environment variables cannot be accessed on the client');
  }
  if (!serverEnvCache) {
    serverEnvCache = parseServerEnv();
  }
  return serverEnvCache;
};

// Type-safe environment variable access
export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
