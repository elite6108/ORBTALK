-- Check server_members policies
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'server_members'
ORDER BY policyname;
