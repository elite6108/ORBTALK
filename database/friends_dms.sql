-- =====================================================
-- ORBIT FRIENDS & DIRECT MESSAGES (Supabase-ready)
-- This augments the base schema with friends and DM features
-- =====================================================

-- ---------------------------
-- FRIEND REQUESTS
-- ---------------------------
CREATE TABLE IF NOT EXISTS public.friend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','blocked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,

    CONSTRAINT friend_request_no_self CHECK (requester_id <> addressee_id),
    CONSTRAINT friend_request_unique UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_requester_id ON public.friend_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_addressee_id ON public.friend_requests(addressee_id);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for friend_requests
DROP POLICY IF EXISTS "View own friend requests" ON public.friend_requests;
DROP POLICY IF EXISTS "Create friend request" ON public.friend_requests;
DROP POLICY IF EXISTS "Respond to friend request" ON public.friend_requests;

-- requester or addressee can see the request
CREATE POLICY "View own friend requests" ON public.friend_requests
  FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- only requester can create, and not to self
CREATE POLICY "Create friend request" ON public.friend_requests
  FOR INSERT
  WITH CHECK (auth.uid() = requester_id AND requester_id <> addressee_id);

-- requester can cancel pending; addressee can accept/decline/block
CREATE POLICY "Respond to friend request" ON public.friend_requests
  FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- ---------------------------
-- FRIENDSHIPS (bidirectional rows)
-- ---------------------------
CREATE TABLE IF NOT EXISTS public.friendships (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, friend_id),
    CONSTRAINT friendship_no_self CHECK (user_id <> friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View own friendships" ON public.friendships;
DROP POLICY IF EXISTS "Manage own friendships" ON public.friendships;

CREATE POLICY "View own friendships" ON public.friendships
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- allow each participant to delete their own friendship row
CREATE POLICY "Manage own friendships" ON public.friendships
  FOR ALL
  USING (auth.uid() = user_id);

-- ---------------------------
-- DIRECT MESSAGES
-- ---------------------------
CREATE TABLE IF NOT EXISTS public.dm_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dm_threads_last_message_at ON public.dm_threads(last_message_at);

ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.dm_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_read_at TIMESTAMPTZ,
    CONSTRAINT dm_participant_unique UNIQUE (thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dm_participants_thread_id ON public.dm_participants(thread_id);
CREATE INDEX IF NOT EXISTS idx_dm_participants_user_id ON public.dm_participants(user_id);

ALTER TABLE public.dm_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View own dm participants" ON public.dm_participants;
DROP POLICY IF EXISTS "Manage own dm participants" ON public.dm_participants;

CREATE POLICY "View own dm participants" ON public.dm_participants
  FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.dm_participants p2 WHERE p2.thread_id = dm_participants.thread_id AND p2.user_id = auth.uid()
  ));

CREATE POLICY "Manage own dm participants" ON public.dm_participants
  FOR ALL
  USING (auth.uid() = user_id);

-- Now that dm_participants exists, we can define dm_threads policies that reference it
DROP POLICY IF EXISTS "View own dm threads" ON public.dm_threads;
DROP POLICY IF EXISTS "Manage own dm threads" ON public.dm_threads;

-- Can view a thread if you are a participant
CREATE POLICY "View own dm threads" ON public.dm_threads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dm_participants p
      WHERE p.thread_id = dm_threads.id AND p.user_id = auth.uid()
    )
  );

-- Let admins or system processes manage threads; typical writes go through admin client
CREATE POLICY "Manage own dm threads" ON public.dm_threads
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.dm_participants p
      WHERE p.thread_id = dm_threads.id AND p.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.dm_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (content_type IN ('text','image','file','embed')),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT dm_content_not_empty CHECK (length(trim(content)) > 0),
    CONSTRAINT dm_content_length CHECK (length(content) <= 4000)
);

CREATE INDEX IF NOT EXISTS idx_dm_messages_thread_id ON public.dm_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_sender_id ON public.dm_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_created_at ON public.dm_messages(created_at);

ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View dm messages if participant" ON public.dm_messages;
DROP POLICY IF EXISTS "Send dm messages if participant" ON public.dm_messages;
DROP POLICY IF EXISTS "Update own dm messages" ON public.dm_messages;

CREATE POLICY "View dm messages if participant" ON public.dm_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dm_participants p
      WHERE p.thread_id = dm_messages.thread_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Send dm messages if participant" ON public.dm_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.dm_participants p
      WHERE p.thread_id = dm_messages.thread_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Update own dm messages" ON public.dm_messages
  FOR UPDATE
  USING (auth.uid() = sender_id);

-- ---------------------------
-- TRIGGERS
-- ---------------------------
-- Reuse public.update_updated_at_column from base schema
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_dm_threads_updated_at') THEN
    CREATE TRIGGER trg_dm_threads_updated_at BEFORE UPDATE ON public.dm_threads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_dm_messages_updated_at') THEN
    CREATE TRIGGER trg_dm_messages_updated_at BEFORE UPDATE ON public.dm_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- Maintain dm_threads.last_message_at on new dm_messages
CREATE OR REPLACE FUNCTION public.update_dm_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.dm_threads SET last_message_at = NEW.created_at, updated_at = NOW() WHERE id = NEW.thread_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.dm_threads SET updated_at = NOW() WHERE id = OLD.thread_id;
    RETURN OLD;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;
END; $$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_dm_messages_last_ts') THEN
    CREATE TRIGGER trg_dm_messages_last_ts
      AFTER INSERT OR DELETE ON public.dm_messages
      FOR EACH ROW EXECUTE FUNCTION public.update_dm_thread_last_message();
  END IF;
END$$;

-- =====================================================
-- END
-- =====================================================


