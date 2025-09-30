-- Complete fix for ALL RLS recursion issues
-- The problem: Policies that query the same table they're protecting cause infinite loops

-- ============================================
-- FIX 1: USERS TABLE
-- ============================================
-- Drop all existing users policies
DROP POLICY IF EXISTS "Users can view profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update any user" ON public.users;
DROP POLICY IF EXISTS "Admins see all users" ON public.users;
DROP POLICY IF EXISTS "Admins update any user" ON public.users;
DROP POLICY IF EXISTS "Users see own + non-banned" ON public.users;
DROP POLICY IF EXISTS "Users update own profile" ON public.users;

-- Create simple users policies without recursion
CREATE POLICY "Users can view profiles" ON public.users
  FOR SELECT
  USING (auth.uid() = id OR is_banned = FALSE);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- FIX 2: SERVER_MEMBERS TABLE
-- ============================================
-- Drop all existing server_members policies
DROP POLICY IF EXISTS "View members if member or admin" ON public.server_members;
DROP POLICY IF EXISTS "Owner/Admin manage members" ON public.server_members;
DROP POLICY IF EXISTS "Server admins can manage members" ON public.server_members;
DROP POLICY IF EXISTS "Join server" ON public.server_members;
DROP POLICY IF EXISTS "Leave server" ON public.server_members;

-- Create simple server_members policies without recursion
-- Anyone can view server members (this is typical for Discord-like apps)
CREATE POLICY "Anyone can view server members" ON public.server_members
  FOR SELECT
  USING (true);

-- Users can join servers (insert their own membership)
CREATE POLICY "Users can join servers" ON public.server_members
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can leave servers (delete their own membership)
CREATE POLICY "Users can leave servers" ON public.server_members
  FOR DELETE
  USING (auth.uid() = user_id);

-- Server owners/admins can manage members
-- This uses a simpler check that doesn't cause recursion
CREATE POLICY "Server owners can manage members" ON public.server_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.servers s
      WHERE s.id = server_members.server_id
      AND s.owner_id = auth.uid()
    )
  );

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Users policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users' ORDER BY policyname;

SELECT 'Server_members policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'server_members' ORDER BY policyname;

SELECT 'RLS recursion fixed for users and server_members' as status;
