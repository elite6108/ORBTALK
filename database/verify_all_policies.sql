-- Verify current state of all policies
SELECT 'SERVER_MEMBERS:' as table_name;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'server_members' 
ORDER BY policyname;

SELECT 'USERS:' as table_name;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;

SELECT 'MESSAGES:' as table_name;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'messages' 
ORDER BY policyname;

SELECT 'CHANNELS:' as table_name;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'channels' 
ORDER BY policyname;
