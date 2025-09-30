-- Comprehensive check for all potential recursion sources

-- 1. All policies on server_members
SELECT '=== SERVER_MEMBERS POLICIES ===' as section;
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'server_members'
ORDER BY policyname;

-- 2. All policies on channels
SELECT '=== CHANNELS POLICIES ===' as section;
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'channels'
ORDER BY policyname;

-- 3. All policies on messages (especially INSERT/ALL)
SELECT '=== MESSAGES POLICIES ===' as section;
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'messages'
ORDER BY policyname;

-- 4. All policies on users
SELECT '=== USERS POLICIES ===' as section;
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- 5. Any views involving server_members
SELECT '=== VIEWS WITH SERVER_MEMBERS ===' as section;
SELECT schemaname, viewname, definition
FROM pg_views
WHERE definition LIKE '%server_members%'
AND schemaname = 'public';

-- 6. Triggers on server_members
SELECT '=== SERVER_MEMBERS TRIGGERS ===' as section;
SELECT trigger_name, event_manipulation, action_statement, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'server_members'
AND event_object_schema = 'public';

-- 7. Triggers on channels
SELECT '=== CHANNELS TRIGGERS ===' as section;
SELECT trigger_name, event_manipulation, action_statement, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'channels'
AND event_object_schema = 'public';

-- 8. All helper functions that query server_members
SELECT '=== FUNCTIONS QUERYING SERVER_MEMBERS ===' as section;
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prokind = 'f'
AND pg_get_functiondef(p.oid) LIKE '%server_members%'
ORDER BY p.proname;

-- 9. RLS status on all tables
SELECT '=== RLS STATUS ===' as section;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'server_members', 'channels', 'messages')
ORDER BY tablename;
