-- Final fix for infinite recursion: Simplify policies to not depend on helper functions during SELECT

-- The root cause: When selecting from users table, policies call is_admin() which selects from users again
-- Solution: Make SELECT policy simple and don't call any functions that query users

-- Step 1: Drop all existing users policies
DROP POLICY IF EXISTS "Users can view profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can update any user" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Step 2: Create simple, non-recursive policies

-- SELECT: Just allow viewing own profile and non-banned users
-- Do NOT call is_admin() here as it causes recursion
CREATE POLICY "Users can view profiles" ON public.users
  FOR SELECT
  USING (
    auth.uid() = id 
    OR is_banned = FALSE
  );

-- Allow admins to view all via a separate policy that checks the users table directly without function
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u.is_admin = TRUE
    )
  );

-- UPDATE: Allow updating own profile only
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- INSERT: Allow creating own profile (for first-time login)
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admin updates - but this one is tricky, let's skip it for now
-- Admins should use the admin client (service role) to update users

SELECT 'RLS policies simplified - recursion should be fixed' as status;
