-- =====================================================
-- ORBIT RLS HELPERS + POLICIES (compatible with base schema)
-- =====================================================

-- ---------- SAFETY: helper indexes for policy predicates ----------
CREATE INDEX IF NOT EXISTS idx_server_members_server_user
  ON public.server_members (server_id, user_id);

CREATE INDEX IF NOT EXISTS idx_channel_permissions_channel
  ON public.channel_permissions (channel_id);

CREATE INDEX IF NOT EXISTS idx_channel_permissions_user
  ON public.channel_permissions (user_id);

-- =====================================================
-- HELPER FUNCTIONS (overloads compatible with base schema)
-- =====================================================

-- Is current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin() STABLE;

-- Is current user a member of the given server?
-- (overload distinct from base: base also has is_server_member(server_uuid uuid, user_uuid uuid))
CREATE OR REPLACE FUNCTION public.is_server_member(server_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_id = server_uuid AND user_id = auth.uid()
  );
END;
$$;
ALTER FUNCTION public.is_server_member(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_server_member(uuid) STABLE;

-- Does current user have a specific role in the server?
-- Note: server_members.role is public.member_role; compare via ::text
CREATE OR REPLACE FUNCTION public.has_server_role(server_uuid UUID, required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.server_members
    WHERE server_id = server_uuid
      AND user_id = auth.uid()
      AND (role::text = required_role)
  );
END;
$$;
ALTER FUNCTION public.has_server_role(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.has_server_role(uuid, text) STABLE;

-- Wrapper overload that delegates to the base 3-arg has_server_permission(server_uuid, user_uuid, permission_name)
-- so policies can call has_server_permission(server_id, 'manage_channels') using auth.uid()
CREATE OR REPLACE FUNCTION public.has_server_permission(server_uuid UUID, permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.has_server_permission(server_uuid, auth.uid(), permission_name);
END;
$$;
ALTER FUNCTION public.has_server_permission(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.has_server_permission(uuid, text) STABLE;

-- Can current user access a channel? (handles private channels via channel_permissions)
CREATE OR REPLACE FUNCTION public.can_access_channel(channel_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.channels c
    JOIN public.server_members sm ON sm.server_id = c.server_id
    WHERE c.id = channel_uuid
      AND sm.user_id = auth.uid()
      AND (
        c.is_private = FALSE
        OR EXISTS (
            SELECT 1
            FROM public.channel_permissions cp
            WHERE cp.channel_id = c.id
              AND (cp.user_id = auth.uid() OR cp.role::text = sm.role::text)
              AND cp.can_view = TRUE
        )
      )
  );
END;
$$;
ALTER FUNCTION public.can_access_channel(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.can_access_channel(uuid) STABLE;

-- Log admin actions (writes to audit_logs.admin_id)
CREATE OR REPLACE FUNCTION public.log_admin_action(
  action_name TEXT,
  table_name TEXT,
  record_id UUID,
  old_values JSONB DEFAULT NULL,
  new_values JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Optionally guard to admins only:
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO public.audit_logs (action, table_name, record_id, admin_id, old_values, new_values)
  VALUES (action_name, table_name, record_id, auth.uid(), old_values, new_values);
END;
$$;
ALTER FUNCTION public.log_admin_action(text, text, uuid, jsonb, jsonb) SET search_path = public, pg_temp;
-- VOLATILE (writes) is default; keep as-is

-- Log user actions (writes to audit_logs.user_id) – useful for rate limiting non-admin paths
CREATE OR REPLACE FUNCTION public.log_user_action(
  action_name TEXT,
  table_name TEXT,
  record_id UUID,
  old_values JSONB DEFAULT NULL,
  new_values JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_logs (action, table_name, record_id, user_id, old_values, new_values)
  VALUES (action_name, table_name, record_id, auth.uid(), old_values, new_values);
END;
$$;
ALTER FUNCTION public.log_user_action(text, text, uuid, jsonb, jsonb) SET search_path = public, pg_temp;

-- Rate-limit checker: count both user_id and admin_id
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  user_uuid UUID,
  action_type TEXT,
  limit_per_minute INTEGER DEFAULT 30,
  limit_per_hour  INTEGER DEFAULT 1000
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE minute_count INTEGER; hour_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO minute_count
  FROM public.audit_logs
  WHERE (user_id = user_uuid OR admin_id = user_uuid)
    AND action = action_type
    AND created_at > NOW() - INTERVAL '1 minute';

  IF minute_count >= limit_per_minute THEN
    RETURN FALSE;
  END IF;

  SELECT COUNT(*) INTO hour_count
  FROM public.audit_logs
  WHERE (user_id = user_uuid OR admin_id = user_uuid)
    AND action = action_type
    AND created_at > NOW() - INTERVAL '1 hour';

  IF hour_count >= limit_per_hour THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;
ALTER FUNCTION public.check_rate_limit(uuid, text, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_rate_limit(uuid, text, integer, integer) STABLE;

-- =====================================================
-- POLICIES (drop + create)
-- =====================================================

-- -------- USERS --------
DROP POLICY IF EXISTS "Users can view profiles"        ON public.users;
DROP POLICY IF EXISTS "Users can update own profile"   ON public.users;
DROP POLICY IF EXISTS "Admins can view all users"      ON public.users;
DROP POLICY IF EXISTS "Admins can update any user"     ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile"   ON public.users;

-- View: self or any non-banned user (admins see everything via admin policy below)
CREATE POLICY "Users can view profiles" ON public.users
  FOR SELECT
  USING (auth.uid() = id OR NOT is_banned);

-- Update: only your own row; prevent toggling admin/mod/banned flags
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_admin = (SELECT u.is_admin FROM public.users u WHERE u.id = auth.uid())
    AND is_moderator = (SELECT u.is_moderator FROM public.users u WHERE u.id = auth.uid())
    AND is_banned = (SELECT u.is_banned FROM public.users u WHERE u.id = auth.uid())
  );

-- Insert: allow first-login upsert pattern
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admin visibility/control
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update any user" ON public.users
  FOR UPDATE
  USING (public.is_admin());

-- -------- SERVERS --------
DROP POLICY IF EXISTS "Users can view accessible servers" ON public.servers;
DROP POLICY IF EXISTS "Server owners can update servers"  ON public.servers;
DROP POLICY IF EXISTS "Admins can update any server"      ON public.servers;
DROP POLICY IF EXISTS "Users can create servers"          ON public.servers;
DROP POLICY IF EXISTS "Admins can delete servers"         ON public.servers;

CREATE POLICY "Users can view accessible servers" ON public.servers
  FOR SELECT
  USING (
    is_public = TRUE
    OR public.is_server_member(id)
    OR public.is_admin()
  );

CREATE POLICY "Server owners can update servers" ON public.servers
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins can update any server" ON public.servers
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Users can create servers" ON public.servers
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Admins can delete servers" ON public.servers
  FOR DELETE
  USING (public.is_admin());

-- -------- SERVER MEMBERS --------
DROP POLICY IF EXISTS "Users can view server members" ON public.server_members;
DROP POLICY IF EXISTS "Users can join servers"        ON public.server_members;
DROP POLICY IF EXISTS "Users can leave servers"       ON public.server_members;
DROP POLICY IF EXISTS "Server admins can manage members" ON public.server_members;

CREATE POLICY "Users can view server members" ON public.server_members
  FOR SELECT
  USING (public.is_server_member(server_id) OR public.is_admin());

-- prevent self-promotion on join; members only
CREATE POLICY "Users can join servers" ON public.server_members
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND role = 'member');

CREATE POLICY "Users can leave servers" ON public.server_members
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Server admins can manage members" ON public.server_members
  FOR ALL
  USING (
    public.has_server_role(server_id, 'owner')
    OR public.has_server_role(server_id, 'admin')
    OR public.is_admin()
  );

-- -------- CHANNELS --------
DROP POLICY IF EXISTS "Users can view accessible channels" ON public.channels;
DROP POLICY IF EXISTS "Server admins can manage channels"  ON public.channels;

CREATE POLICY "Users can view accessible channels" ON public.channels
  FOR SELECT
  USING (public.is_server_member(server_id) OR public.is_admin());

CREATE POLICY "Server admins can manage channels" ON public.channels
  FOR ALL
  USING (public.has_server_permission(server_id, 'manage_channels') OR public.is_admin());

-- -------- CHANNEL PERMISSIONS --------
DROP POLICY IF EXISTS "Users can view channel permissions"        ON public.channel_permissions;
DROP POLICY IF EXISTS "Server admins can manage channel permissions" ON public.channel_permissions;

CREATE POLICY "Users can view channel permissions" ON public.channel_permissions
  FOR SELECT
  USING (public.can_access_channel(channel_id) OR public.is_admin());

CREATE POLICY "Server admins can manage channel permissions" ON public.channel_permissions
  FOR ALL
  USING (public.has_server_permission(server_id, 'manage_channels') OR public.is_admin());

-- -------- MESSAGES --------
DROP POLICY IF EXISTS "Users can view accessible messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages"          ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages"      ON public.messages;
DROP POLICY IF EXISTS "Moderators can manage messages"     ON public.messages;

CREATE POLICY "Users can view accessible messages" ON public.messages
  FOR SELECT
  USING (public.can_access_channel(channel_id) OR public.is_admin());

-- allow send in:
--   (A) non-private channels in servers you're a member of, OR
--   (B) private channels where you or your role have explicit can_send_messages
CREATE POLICY "Users can create messages" ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1
        FROM public.channels c
        JOIN public.server_members sm ON sm.server_id = c.server_id
        WHERE c.id = messages.channel_id
          AND sm.user_id = auth.uid()
          AND c.is_private = FALSE
      )
      OR EXISTS (
        SELECT 1
        FROM public.channels c
        JOIN public.server_members sm ON sm.server_id = c.server_id
        JOIN public.channel_permissions cp ON cp.channel_id = c.id
        WHERE c.id = messages.channel_id
          AND sm.user_id = auth.uid()
          AND (cp.user_id = auth.uid() OR cp.role::text = sm.role::text)
          AND cp.can_send_messages = TRUE
      )
    )
  );

-- 15-minute edit window for own messages
CREATE POLICY "Users can update own messages" ON public.messages
  FOR UPDATE
  USING (auth.uid() = user_id AND created_at > NOW() - INTERVAL '15 minutes');

-- moderators/owners/admins manage messages
CREATE POLICY "Moderators can manage messages" ON public.messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.channels c
      JOIN public.server_members sm ON sm.server_id = c.server_id
      WHERE c.id = messages.channel_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner','admin','moderator')
    )
    OR public.is_admin()
  );

-- -------- MESSAGE ATTACHMENTS --------
DROP POLICY IF EXISTS "Users can view message attachments"   ON public.message_attachments;
DROP POLICY IF EXISTS "Users can create message attachments" ON public.message_attachments;
DROP POLICY IF EXISTS "Moderators can manage attachments"    ON public.message_attachments;

CREATE POLICY "Users can view message attachments" ON public.message_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.messages m
      WHERE m.id = message_attachments.message_id
        AND public.can_access_channel(m.channel_id)
    )
    OR public.is_admin()
  );

CREATE POLICY "Users can create message attachments" ON public.message_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.messages m
      WHERE m.id = message_attachments.message_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Moderators can manage attachments" ON public.message_attachments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.messages m
      JOIN public.channels c ON c.id = m.channel_id
      JOIN public.server_members sm ON sm.server_id = c.server_id
      WHERE m.id = message_attachments.message_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner','admin','moderator')
    )
    OR public.is_admin()
  );

-- -------- VOICE SESSIONS --------
DROP POLICY IF EXISTS "Users can view voice sessions"          ON public.voice_sessions;
DROP POLICY IF EXISTS "Users can manage own voice sessions"    ON public.voice_sessions;
DROP POLICY IF EXISTS "Moderators can manage voice sessions"   ON public.voice_sessions;

CREATE POLICY "Users can view voice sessions" ON public.voice_sessions
  FOR SELECT
  USING (public.can_access_channel(channel_id) OR public.is_admin());

CREATE POLICY "Users can manage own voice sessions" ON public.voice_sessions
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Moderators can manage voice sessions" ON public.voice_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.channels c
      JOIN public.server_members sm ON sm.server_id = c.server_id
      WHERE c.id = voice_sessions.channel_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner','admin','moderator')
    )
    OR public.is_admin()
  );

-- -------- AUDIT LOGS --------
DROP POLICY IF EXISTS "Only admins can access audit logs" ON public.audit_logs;
CREATE POLICY "Only admins can access audit logs" ON public.audit_logs
  FOR ALL
  USING (public.is_admin());

-- -------- REPORTS --------
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can manage reports" ON public.reports;

CREATE POLICY "Users can create reports" ON public.reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports" ON public.reports
  FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can manage reports" ON public.reports
  FOR ALL
  USING (public.is_admin());

-- -------- SYSTEM SETTINGS --------
DROP POLICY IF EXISTS "Admins manage settings" ON public.system_settings;
DROP POLICY IF EXISTS "Read public settings"   ON public.system_settings;
DROP POLICY IF EXISTS "Public settings are readable" ON public.system_settings;

CREATE POLICY "Admins manage settings" ON public.system_settings
  FOR ALL
  USING (public.is_admin());

CREATE POLICY "Read public settings" ON public.system_settings
  FOR SELECT
  USING (is_public = TRUE OR public.is_admin());

-- =====================================================
-- END
-- =====================================================
