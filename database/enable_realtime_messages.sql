-- Enable Supabase Realtime on messages table
-- Run this in Supabase SQL editor

-- Ensure publication exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
  END IF;
END$$;

-- Add messages table to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END$$;

-- Enable REPLICA IDENTITY for reliable UPDATE/DELETE payloads
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Verify realtime is enabled
SELECT 
  schemaname,
  tablename,
  'Realtime enabled' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'messages';
