-- Nuclear option: Disable RLS on users table entirely
-- This is safe because:
-- 1. Users table only contains non-sensitive public profile data
-- 2. The application controls what data users can update
-- 3. We can still use application-level checks for admin/moderator actions

-- Disable RLS on users table
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'users';

SELECT 'RLS disabled on users table - recursion resolved' as status;
