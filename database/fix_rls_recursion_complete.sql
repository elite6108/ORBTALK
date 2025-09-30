-- Complete fix for infinite recursion in users table RLS policies
-- The issue: Multiple policies and functions query users table, causing recursion

-- Step 1: Fix the is_admin() function to bypass RLS (use CREATE OR REPLACE to avoid dependency issues)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND is_admin = TRUE
  );
$$;

-- Step 2: Fix the is_moderator() function if it exists
CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND is_moderator = TRUE
  );
$$;

-- Step 3: Simplify the users SELECT policy to avoid recursion
DROP POLICY IF EXISTS "Users can view profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

-- Simple policy: users can view their own profile and non-banned users
-- Admin check is done via separate policy that uses SECURITY DEFINER function
CREATE POLICY "Users can view profiles" ON public.users
  FOR SELECT
  USING (
    auth.uid() = id 
    OR NOT is_banned
    OR public.is_admin()
  );

-- Step 4: Simplify UPDATE policy (already done, but ensure it's correct)
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Step 5: Ensure admin policy doesn't cause recursion
DROP POLICY IF EXISTS "Admins can update any user" ON public.users;

CREATE POLICY "Admins can update any user" ON public.users
  FOR UPDATE
  USING (public.is_admin());

-- Verify
SELECT 'RLS recursion fix complete' as status;
