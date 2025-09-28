import { z } from 'zod';

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
  LIVEKIT_URL: z.string().url('LIVEKIT_URL must be a valid URL'),
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
});

// Combined schema for validation
const envSchema = serverEnvSchema.merge(publicEnvSchema);

// Validate environment variables
const parseEnv = (): z.infer<typeof envSchema> => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    // In production, do NOT provide any fallbacks. Require real env vars.
    // In development, provide convenient fallbacks so the app runs locally.
    const source = isProduction
      ? process.env
      : {
          ...process.env,
          // Development fallbacks only
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here',
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yoowbxaglfmconicaqsu.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvb3dieGFnbGZtY29uaWNhcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MTEwMzUsImV4cCI6MjA3NDA4NzAzNX0.vd8eXB0c0tPJGkFl_LT3rfj9lJBCHpdfWY5X_-v0LNA',
          LIVEKIT_URL: process.env.LIVEKIT_URL || 'wss://orbit-ltax36qn.livekit.cloud',
          LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY || 'APIqU9BiCrs5x46',
          LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET || '4n6O0ZGHJimsQfp648HyF1eJfUsNA7xXqpMvIW7WmqoA',
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        };

    return envSchema.parse(source);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Environment validation failed:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
};

// Export validated environment variables
export const env = parseEnv();

// Type-safe environment variable access
export type Env = z.infer<typeof envSchema>;

// Helper to check if we're on the server
export const isServer = (): boolean => typeof window === 'undefined';

// Helper to get server-only env vars (throws on client)
export const getServerEnv = (): z.infer<typeof serverEnvSchema> => {
  if (!isServer()) {
    throw new Error('Server environment variables cannot be accessed on the client');
  }
  return {
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    LIVEKIT_API_KEY: env.LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET: env.LIVEKIT_API_SECRET,
    NODE_ENV: env.NODE_ENV,
  };
};

// Helper to get public env vars (safe for client)
export const getPublicEnv = (): z.infer<typeof publicEnvSchema> => {
  return {
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    LIVEKIT_URL: env.LIVEKIT_URL,
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
  };
};
