# Orbit

A Discord-style MVP with real-time voice and text chat, built with security-first principles.

## Prerequisites

- Node.js (latest stable version)
- pnpm
- Supabase account and project
- LiveKit account and project

## Setup

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd orbit
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Create a `.env.local` file based on `.env.example` and provide the necessary values:

   ```bash
   cp .env.example .env.local
   ```

4. Run the development server:

   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

### Required Variables

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (server only)
- `LIVEKIT_API_KEY`: LiveKit API key
- `LIVEKIT_API_SECRET`: LiveKit API secret
- `LIVEKIT_WS_URL`: LiveKit WebSocket URL (e.g., wss://your-project.livekit.cloud)
- `APP_URL`: Application URL (e.g., http://localhost:3000)
- `NODE_ENV`: Environment mode (`development`, `production`, `test`)

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint issues
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm test` - Run unit tests
- `pnpm test:e2e` - Run end-to-end tests

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript (strict)
- **UI**: Tailwind CSS + shadcn/ui
- **State**: React + server actions/route handlers
- **Realtime Voice**: LiveKit (React components + client)
- **Backend/BaaS**: Supabase (Auth, Realtime, Storage)
- **Desktop**: Tauri wrapper
- **Tooling**: pnpm, ESLint, Prettier, Vitest, Playwright, Zod

## Security Features

- No secrets client-side
- Environment variable validation with Zod
- Input validation on all API endpoints
- Rate limiting for sensitive endpoints
- Secure headers (CSP, HSTS, etc.)
- Pre-commit hooks for code quality

## Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API routes
│   ├── (auth)/         # Auth pages
│   └── (dashboard)/    # Main app pages
├── lib/                # Utilities and configurations
│   ├── env.ts         # Environment validation
│   └── utils.ts       # Utility functions
└── components/         # Reusable UI components
```

## Development

This project follows strict security and code quality standards:

- TypeScript strict mode enabled
- ESLint with security plugins
- Prettier for code formatting
- Pre-commit hooks for quality gates
- Comprehensive input validation
- Rate limiting on sensitive endpoints

## Troubleshooting

### Environment Variables

If you encounter environment validation errors, ensure all required variables are set in your `.env.local` file and match the expected format.

### TypeScript Errors

Run `pnpm typecheck` to identify TypeScript issues. The project uses strict mode, so all types must be explicitly defined.

### Linting Issues

Run `pnpm lint:fix` to automatically fix most ESLint issues. For security-related warnings, review the code and ensure proper validation is in place.
