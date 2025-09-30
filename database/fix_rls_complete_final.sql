-- Complete fix: Remove ALL recursive policies from users table

-- Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Users can view profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update any user" ON public.users;
DROP POLICY IF EXISTS "Admins see all users" ON public.users;
DROP POLICY IF EXISTS "Admins update any user" ON public.users;
DROP POLICY IF EXISTS "Users see own + non-banned" ON public.users;
DROP POLICY IF EXISTS "Users update own profile" ON public.users;

-- Create simple, NON-RECURSIVE policies

-- SELECT: Allow viewing own profile and non-banned users
-- DO NOT query users table in the policy
CREATE POLICY "Users can view profiles" ON public.users
  FOR SELECT
  USING (
    auth.uid() = id 
    OR is_banned = FALSE
  );

-- INSERT: Allow creating own profile
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- UPDATE: Allow updating own profile only
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Verify all policies
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
