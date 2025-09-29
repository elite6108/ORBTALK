-- Enable Supabase Realtime on new Friends/DM tables
-- Run this once in Supabase SQL editor after creating the tables

-- Ensure publication exists (created by Supabase by default)
-- Add DM tables to the publication if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
  END IF;
END$$;

-- Helper function to add table to publication if missing
CREATE OR REPLACE FUNCTION public._add_to_realtime_pub(tbl regclass)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = split_part(tbl::text, '.', 1)
      AND tablename = split_part(tbl::text, '.', 2)
  ) THEN
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %s', tbl);
  END IF;
END; $$ LANGUAGE plpgsql;

SELECT public._add_to_realtime_pub('public.friend_requests');
SELECT public._add_to_realtime_pub('public.friendships');
SELECT public._add_to_realtime_pub('public.dm_threads');
SELECT public._add_to_realtime_pub('public.dm_participants');
SELECT public._add_to_realtime_pub('public.dm_messages');

-- For reliable UPDATE/DELETE payloads
ALTER TABLE public.dm_messages REPLICA IDENTITY FULL;

-- Cleanup helper (optional)
DROP FUNCTION IF EXISTS public._add_to_realtime_pub(regclass);







