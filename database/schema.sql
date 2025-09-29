-- =====================================================
-- ORBIT DATABASE SCHEMA (Supabase-ready, cleaned)
-- Discord-style MVP with security-first design
-- =====================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS
-- =====================================================
DO $$
BEGIN
  CREATE TYPE public.member_role AS ENUM ('owner','admin','moderator','member');
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Admin / moderation
    is_admin BOOLEAN DEFAULT FALSE,
    is_moderator BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    banned_at TIMESTAMPTZ,
    banned_by UUID REFERENCES public.users(id),

    -- Rate limiting (optional counters)
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]{3,50}$'),
    CONSTRAINT display_name_length CHECK (display_name IS NULL OR LENGTH(display_name) <= 100),
    CONSTRAINT bio_length CHECK (bio IS NULL OR LENGTH(bio) <= 500),
    CONSTRAINT banned_requires_context CHECK (
      NOT is_banned OR (banned_at IS NOT NULL AND banned_by IS NOT NULL)
    )
);

-- Servers
CREATE TABLE IF NOT EXISTS public.servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    banner_url TEXT,
    invite_code VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(10),'hex'), -- 20 hex chars, URL-safe
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT TRUE,
    member_count INTEGER NOT NULL DEFAULT 0,
    max_members INTEGER NOT NULL DEFAULT 1000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Admin flags
    is_verified BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspension_reason TEXT,
    suspended_at TIMESTAMPTZ,
    suspended_by UUID REFERENCES public.users(id),

    -- Constraints
    CONSTRAINT server_name_length CHECK (LENGTH(name) BETWEEN 2 AND 100),
    CONSTRAINT server_desc_length CHECK (description IS NULL OR LENGTH(description) <= 1000),
    CONSTRAINT max_members_range CHECK (max_members > 0 AND max_members <= 10000)
);

-- Server members
CREATE TABLE IF NOT EXISTS public.server_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role public.member_role NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    invited_by UUID REFERENCES public.users(id),

    -- Granular perms (optional; role still primary)
    can_manage_channels BOOLEAN DEFAULT FALSE,
    can_manage_roles BOOLEAN DEFAULT FALSE,
    can_kick_members BOOLEAN DEFAULT FALSE,
    can_ban_members BOOLEAN DEFAULT FALSE,
    can_manage_server BOOLEAN DEFAULT FALSE,
    can_manage_messages BOOLEAN DEFAULT FALSE,
    can_mention_everyone BOOLEAN DEFAULT FALSE,
    can_manage_webhooks BOOLEAN DEFAULT FALSE,
    can_manage_emojis BOOLEAN DEFAULT FALSE,

    -- Moderation
    is_muted BOOLEAN DEFAULT FALSE,
    muted_until TIMESTAMPTZ,
    muted_by UUID REFERENCES public.users(id),
    mute_reason TEXT,

    UNIQUE(server_id, user_id)
);

-- Server roles (Discord-like, with bitmask permissions)
CREATE TABLE IF NOT EXISTS public.server_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color INTEGER,
    position INTEGER NOT NULL DEFAULT 0,
    permissions BIGINT NOT NULL DEFAULT 0, -- bitmask
    mentionable BOOLEAN NOT NULL DEFAULT FALSE,
    hoist BOOLEAN NOT NULL DEFAULT FALSE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT role_name_length CHECK (LENGTH(name) BETWEEN 1 AND 100),
    CONSTRAINT ux_role_unique_per_server UNIQUE (server_id, name)
);

-- Many-to-many assignment of roles to members
CREATE TABLE IF NOT EXISTS public.server_member_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.server_roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ux_member_role UNIQUE (server_id, user_id, role_id)
);

-- Channels
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'voice', 'category')),
    position INTEGER NOT NULL DEFAULT 0,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Voice-specific
    max_participants INTEGER NOT NULL DEFAULT 0, -- 0 = unlimited
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,

    -- Admin
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archived_by UUID REFERENCES public.users(id),

    -- Constraints
    CONSTRAINT channel_name_length CHECK (LENGTH(name) BETWEEN 2 AND 100),
    CONSTRAINT channel_desc_length CHECK (description IS NULL OR LENGTH(description) <= 500),
    CONSTRAINT max_participants_range CHECK (max_participants >= 0 AND max_participants <= 1000)
);

-- Channel permissions (for private channels)
CREATE TABLE IF NOT EXISTS public.channel_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role public.member_role, -- no FK to server_members.role; use shared ENUM
    server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,

    -- Permissions
    can_view BOOLEAN DEFAULT TRUE,
    can_send_messages BOOLEAN DEFAULT TRUE,
    can_manage_messages BOOLEAN DEFAULT FALSE,
    can_manage_channel BOOLEAN DEFAULT FALSE,

    CONSTRAINT channel_permissions_user_or_role CHECK (
      (user_id IS NOT NULL AND role IS NULL) OR
      (user_id IS NULL AND role IS NOT NULL)
    )
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'file', 'embed')),

    -- Metadata
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    edited_at TIMESTAMPTZ,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    pinned_at TIMESTAMPTZ,
    pinned_by UUID REFERENCES public.users(id),

    -- Threading
    parent_message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    thread_id UUID, -- optional grouping id (leave nullable or add FK to messages)

    -- Reactions
    reactions JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Soft delete
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.users(id),
    deletion_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT content_not_empty CHECK (length(trim(content)) > 0),
    CONSTRAINT content_length CHECK (length(content) <= 4000)
);

-- Message attachments
CREATE TABLE IF NOT EXISTS public.message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT file_size_positive CHECK (file_size > 0),
    CONSTRAINT file_size_limit CHECK (file_size <= 10485760), -- 10MB
    CONSTRAINT dimensions_positive CHECK (
      (width IS NULL OR width > 0) AND (height IS NULL OR height > 0)
    )
);

-- Voice sessions (LiveKit integration)
CREATE TABLE IF NOT EXISTS public.voice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL, -- LiveKit session ID
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    is_deafened BOOLEAN NOT NULL DEFAULT FALSE,

    UNIQUE(session_id)
);

-- =====================================================
-- ADMIN & MODERATION
-- =====================================================

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID,
    user_id UUID REFERENCES public.users(id),
    admin_id UUID REFERENCES public.users(id),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT action_not_empty CHECK (length(trim(action)) > 0)
);

-- Reports
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    reported_message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    reported_server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','investigating','resolved','dismissed')),
    resolved_by UUID REFERENCES public.users(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT report_target CHECK (
      reported_user_id IS NOT NULL OR 
      reported_message_id IS NOT NULL OR 
      reported_server_id IS NOT NULL
    )
);

-- System settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT key_not_empty CHECK (length(trim(key)) > 0)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_status   ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON public.users(last_seen);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin);

-- Servers
CREATE INDEX IF NOT EXISTS idx_servers_owner_id ON public.servers(owner_id);
CREATE INDEX IF NOT EXISTS idx_servers_invite_code ON public.servers(invite_code);
CREATE INDEX IF NOT EXISTS idx_servers_is_public ON public.servers(is_public);
CREATE INDEX IF NOT EXISTS idx_servers_created_at ON public.servers(created_at);

-- Server roles
CREATE INDEX IF NOT EXISTS idx_server_roles_server_id ON public.server_roles(server_id);
CREATE INDEX IF NOT EXISTS idx_server_roles_position ON public.server_roles(position);
CREATE INDEX IF NOT EXISTS idx_server_member_roles_server_user ON public.server_member_roles(server_id, user_id);

-- Server members
CREATE INDEX IF NOT EXISTS idx_server_members_server_id ON public.server_members(server_id);
CREATE INDEX IF NOT EXISTS idx_server_members_user_id ON public.server_members(user_id);
CREATE INDEX IF NOT EXISTS idx_server_members_role ON public.server_members(role);

-- Channels
CREATE INDEX IF NOT EXISTS idx_channels_server_id ON public.channels(server_id);
CREATE INDEX IF NOT EXISTS idx_channels_type ON public.channels(type);
CREATE INDEX IF NOT EXISTS idx_channels_position ON public.channels(position);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON public.messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_parent_message_id ON public.messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id);
-- feed-friendly composite
CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON public.messages(channel_id, created_at DESC);
-- reactions GIN (optional)
CREATE INDEX IF NOT EXISTS idx_messages_reactions_gin ON public.messages USING GIN (reactions);

-- Voice sessions
CREATE INDEX IF NOT EXISTS idx_voice_sessions_channel_id ON public.voice_sessions(channel_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_user_id ON public.voice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_joined_at ON public.voice_sessions(joined_at);
-- one active per user per channel (optional)
CREATE UNIQUE INDEX IF NOT EXISTS ux_voice_user_channel
  ON public.voice_sessions (channel_id, user_id)
  WHERE left_at IS NULL;

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Reports
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user_id ON public.reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
    CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_servers_updated_at') THEN
    CREATE TRIGGER trg_servers_updated_at BEFORE UPDATE ON public.servers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_channels_updated_at') THEN
    CREATE TRIGGER trg_channels_updated_at BEFORE UPDATE ON public.channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_messages_updated_at') THEN
    CREATE TRIGGER trg_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- member_count maintenance (handles insert/delete/update)
CREATE OR REPLACE FUNCTION public.update_server_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.servers SET member_count = member_count + 1 WHERE id = NEW.server_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.servers SET member_count = member_count - 1 WHERE id = OLD.server_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND NEW.server_id <> OLD.server_id THEN
    UPDATE public.servers SET member_count = member_count - 1 WHERE id = OLD.server_id;
    UPDATE public.servers SET member_count = member_count + 1 WHERE id = NEW.server_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END; $$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_server_member_count') THEN
    CREATE TRIGGER trg_update_server_member_count
      AFTER INSERT OR DELETE OR UPDATE OF server_id ON public.server_members
      FOR EACH ROW EXECUTE FUNCTION public.update_server_member_count();
  END IF;
END$$;

-- =====================================================
-- RLS ENABLE
-- =====================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_member_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- USERS
DROP POLICY IF EXISTS "Users can view profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update any user" ON public.users;
-- Also drop alternate names used by this schema for idempotency
DROP POLICY IF EXISTS "Users see own + non-banned" ON public.users;
DROP POLICY IF EXISTS "Users update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins see all users" ON public.users;
DROP POLICY IF EXISTS "Admins update any user" ON public.users;

CREATE POLICY "Users see own + non-banned"
  ON public.users FOR SELECT
  USING (auth.uid() = id OR NOT is_banned);

CREATE POLICY "Users update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins see all users"
  ON public.users FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin));

CREATE POLICY "Admins update any user"
  ON public.users FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin));

-- SERVERS
DROP POLICY IF EXISTS "Users can view accessible servers" ON public.servers;
DROP POLICY IF EXISTS "Server owners can update servers" ON public.servers;
DROP POLICY IF EXISTS "Admins can update any server" ON public.servers;
DROP POLICY IF EXISTS "Users can create servers" ON public.servers;
-- Alternate names used below
DROP POLICY IF EXISTS "View public or member servers" ON public.servers;
DROP POLICY IF EXISTS "Owner updates server" ON public.servers;
DROP POLICY IF EXISTS "Admins update any server" ON public.servers;
DROP POLICY IF EXISTS "Users create servers" ON public.servers;

CREATE POLICY "View public or member servers"
  ON public.servers FOR SELECT
  USING (
    is_public
    OR EXISTS (SELECT 1 FROM public.server_members m WHERE m.server_id = servers.id AND m.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin)
  );

CREATE POLICY "Owner updates server"
  ON public.servers FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins update any server"
  ON public.servers FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin));

CREATE POLICY "Users create servers"
  ON public.servers FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- SERVER MEMBERS
DROP POLICY IF EXISTS "Users can view server members" ON public.server_members;
DROP POLICY IF EXISTS "Users can join servers" ON public.server_members;
DROP POLICY IF EXISTS "Users can leave servers" ON public.server_members;
DROP POLICY IF EXISTS "Server admins can manage members" ON public.server_members;
-- Alternate names used below
DROP POLICY IF EXISTS "View members if member or admin" ON public.server_members;
DROP POLICY IF EXISTS "Join server" ON public.server_members;
DROP POLICY IF EXISTS "Leave server" ON public.server_members;
DROP POLICY IF EXISTS "Owner/Admin manage members" ON public.server_members;

CREATE POLICY "View members if member or admin"
  ON public.server_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.server_members sm2
      WHERE sm2.server_id = server_members.server_id AND sm2.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin)
  );

CREATE POLICY "Join server"
  ON public.server_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Leave server"
  ON public.server_members FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Owner/Admin manage members"
  ON public.server_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.server_members sm
      WHERE sm.server_id = server_members.server_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner','admin')
    )
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin)
  );

-- SERVER_ROLES
DROP POLICY IF EXISTS "View roles if member" ON public.server_roles;
DROP POLICY IF EXISTS "Manage roles if owner/admin" ON public.server_roles;

CREATE POLICY "View roles if member"
  ON public.server_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.server_members m
      WHERE m.server_id = server_roles.server_id AND m.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin)
  );

CREATE POLICY "Manage roles if owner/admin"
  ON public.server_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.server_members m
      WHERE m.server_id = server_roles.server_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')
    )
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin)
  );

-- SERVER_MEMBER_ROLES
DROP POLICY IF EXISTS "View member roles if member" ON public.server_member_roles;
DROP POLICY IF EXISTS "Assign roles if owner/admin" ON public.server_member_roles;

CREATE POLICY "View member roles if member"
  ON public.server_member_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.server_members m
      WHERE m.server_id = public.server_member_roles.server_id AND m.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin)
  );

CREATE POLICY "Assign roles if owner/admin"
  ON public.server_member_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.server_members m
      WHERE m.server_id = public.server_member_roles.server_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')
    )
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin)
  );

-- CHANNELS
DROP POLICY IF EXISTS "Users can view accessible channels" ON public.channels;
DROP POLICY IF EXISTS "Server admins can manage channels" ON public.channels;
-- Alternate names
DROP POLICY IF EXISTS "View channels if member or admin" ON public.channels;
DROP POLICY IF EXISTS "Owner/Admin manage channels" ON public.channels;

CREATE POLICY "View channels if member or admin"
  ON public.channels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.server_members m
      WHERE m.server_id = channels.server_id AND m.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin)
  );

CREATE POLICY "Owner/Admin manage channels"
  ON public.channels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.server_members sm
      WHERE sm.server_id = channels.server_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner','admin')
    )
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin)
  );

-- MESSAGES
DROP POLICY IF EXISTS "Users can view accessible messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
DROP POLICY IF EXISTS "Moderators can manage messages" ON public.messages;
-- Alternate names
DROP POLICY IF EXISTS "View messages if channel member or admin" ON public.messages;
DROP POLICY IF EXISTS "Create messages if channel member" ON public.messages;
DROP POLICY IF EXISTS "Update own messages" ON public.messages;
DROP POLICY IF EXISTS "Mods manage messages" ON public.messages;

CREATE POLICY "View messages if channel member or admin"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.server_members sm
      JOIN public.channels c ON c.server_id = sm.server_id
      WHERE c.id = messages.channel_id AND sm.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin)
  );

CREATE POLICY "Create messages if channel member"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1
      FROM public.server_members sm
      JOIN public.channels c ON c.server_id = sm.server_id
      WHERE c.id = messages.channel_id AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Update own messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Mods manage messages"
  ON public.messages FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.server_members sm
      JOIN public.channels c ON c.server_id = sm.server_id
      WHERE c.id = messages.channel_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner','admin','moderator')
    )
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin)
  );

-- VOICE SESSIONS
DROP POLICY IF EXISTS "Users can view voice sessions" ON public.voice_sessions;
DROP POLICY IF EXISTS "Users can manage own voice sessions" ON public.voice_sessions;
-- Alternate names
DROP POLICY IF EXISTS "View voice sessions if channel member or admin" ON public.voice_sessions;
DROP POLICY IF EXISTS "Manage own voice sessions" ON public.voice_sessions;

CREATE POLICY "View voice sessions if channel member or admin"
  ON public.voice_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.server_members sm
      JOIN public.channels c ON c.server_id = sm.server_id
      WHERE c.id = voice_sessions.channel_id AND sm.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin)
  );

CREATE POLICY "Manage own voice sessions"
  ON public.voice_sessions FOR ALL
  USING (auth.uid() = user_id);

-- AUDIT LOGS
DROP POLICY IF EXISTS "Only admins can access audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins manage audit logs" ON public.audit_logs;
CREATE POLICY "Admins manage audit logs"
  ON public.audit_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin));

-- REPORTS
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can manage reports" ON public.reports;
-- Alternate name
DROP POLICY IF EXISTS "Create reports (self)" ON public.reports;
-- Exact name created below
DROP POLICY IF EXISTS "Admins manage reports" ON public.reports;

CREATE POLICY "Create reports (self)"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins manage reports"
  ON public.reports FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin));

-- SYSTEM SETTINGS
DROP POLICY IF EXISTS "Only admins can access system settings" ON public.system_settings;
-- Alternate names
DROP POLICY IF EXISTS "Admins manage settings" ON public.system_settings;
DROP POLICY IF EXISTS "Read public settings" ON public.system_settings;

CREATE POLICY "Admins manage settings"
  ON public.system_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin));

CREATE POLICY "Read public settings"
  ON public.system_settings FOR SELECT
  USING (is_public = TRUE);

-- =====================================================
-- FUNCTIONS (with safe search_path)
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_server_member(server_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.server_members 
    WHERE server_id = server_uuid AND user_id = user_uuid
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_server_permission(
  server_uuid UUID, 
  user_uuid UUID, 
  permission_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN 
    EXISTS (
      SELECT 1
      FROM public.server_members sm
      WHERE sm.server_id = server_uuid 
        AND sm.user_id = user_uuid
        AND (
          sm.role = 'owner'
          OR (sm.role = 'admin' AND permission_name IN (
            'manage_channels','manage_roles','kick_members','ban_members',
            'manage_server','manage_messages','mention_everyone',
            'manage_webhooks','manage_emojis'
          ))
          OR (sm.role = 'moderator' AND permission_name IN ('kick_members','manage_messages'))
          OR (permission_name = 'send_messages')
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.server_member_roles smr
      JOIN public.server_roles r ON r.id = smr.role_id
      WHERE smr.server_id = server_uuid
        AND smr.user_id = user_uuid
        AND (
          (permission_name = 'manage_roles'        AND (r.permissions & 1) <> 0) OR
          (permission_name = 'manage_channels'     AND (r.permissions & 2) <> 0) OR
          (permission_name = 'kick_members'        AND (r.permissions & 4) <> 0) OR
          (permission_name = 'ban_members'         AND (r.permissions & 8) <> 0) OR
          (permission_name = 'manage_server'       AND (r.permissions & 16) <> 0) OR
          (permission_name = 'manage_messages'     AND (r.permissions & 32) <> 0) OR
          (permission_name = 'mention_everyone'    AND (r.permissions & 64) <> 0) OR
          (permission_name = 'manage_webhooks'     AND (r.permissions & 128) <> 0) OR
          (permission_name = 'manage_emojis'       AND (r.permissions & 256) <> 0)
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_servers(user_uuid UUID)
RETURNS TABLE (
  server_id UUID,
  server_name VARCHAR(100),
  role public.member_role,
  joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, sm.role, sm.joined_at
  FROM public.servers s
  JOIN public.server_members sm ON sm.server_id = s.id
  WHERE sm.user_id = user_uuid
  ORDER BY sm.joined_at DESC;
END;
$$;

-- lock SECURITY DEFINER search_path
ALTER FUNCTION public.is_server_member(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.has_server_permission(uuid, uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_servers(uuid) SET search_path = public, pg_temp;

-- =====================================================
-- INITIAL DATA
-- =====================================================
INSERT INTO public.system_settings (key, value, description, is_public)
VALUES
('max_file_size', to_jsonb(10485760), 'Maximum file upload size in bytes (10MB)', TRUE),
('max_message_length', to_jsonb(4000), 'Maximum message length in characters', TRUE),
('rate_limit_messages', '{"per_minute":30,"per_hour":1000}'::jsonb, 'Rate limits for message sending', FALSE),
('rate_limit_auth',     '{"per_minute":5,"per_hour":20}'::jsonb,   'Rate limits for authentication attempts', FALSE),
('maintenance_mode',    'false'::jsonb, 'Enable maintenance mode', FALSE),
('registration_enabled','true'::jsonb,  'Allow new user registrations', TRUE)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.users IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE public.servers IS 'Discord-style servers/communities';
COMMENT ON TABLE public.server_members IS 'Server membership with roles and permissions';
COMMENT ON TABLE public.channels IS 'Text and voice channels within servers';
COMMENT ON TABLE public.messages IS 'Chat messages with threading support';
COMMENT ON TABLE public.voice_sessions IS 'Active voice channel sessions';
COMMENT ON TABLE public.audit_logs IS 'System audit trail for admin actions';
COMMENT ON TABLE public.reports IS 'User reports for moderation';
COMMENT ON TABLE public.system_settings IS 'Configurable system settings';

-- =====================================================
-- END
-- =====================================================
