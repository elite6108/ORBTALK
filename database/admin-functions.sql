-- =====================================================
-- ORBIT ADMIN PANEL FUNCTIONS
-- Administrative functions for backend management
-- Compatible with Orbit schema (tables, RLS, triggers)
-- =====================================================

-- =====================================================
-- HELPER FUNCTIONS (NEW: Required for compatibility)
-- =====================================================

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND is_admin = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin actions to audit_logs
CREATE OR REPLACE FUNCTION log_admin_action(
    action TEXT,
    table_name TEXT,
    record_id UUID DEFAULT NULL,
    affected_user_id UUID DEFAULT NULL,  -- NEW: For user_id in logs
    old_values JSONB DEFAULT NULL,
    new_values JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_logs (
        action, table_name, record_id, user_id, admin_id, 
        old_values, new_values, ip_address, user_agent
    )
    VALUES (
        action, table_name, record_id, affected_user_id, auth.uid(),
        old_values, new_values, 
        current_setting('client_addr', TRUE)::INET,
        current_setting('request.header.user-agent', TRUE)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- USER MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to get all users with pagination and filtering
CREATE OR REPLACE FUNCTION get_users_admin(
    page_size INTEGER DEFAULT 50,
    page_offset INTEGER DEFAULT 0,
    search_term TEXT DEFAULT NULL,
    status_filter TEXT DEFAULT NULL,
    role_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    username VARCHAR(50),
    display_name VARCHAR(100),
    email TEXT,
    status VARCHAR(20),
    is_admin BOOLEAN,
    is_moderator BOOLEAN,
    is_banned BOOLEAN,
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    message_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.display_name,
        au.email,
        u.status,
        u.is_admin,
        u.is_moderator,
        u.is_banned,
        u.last_seen,
        u.created_at,
        u.message_count
    FROM public.users u
    JOIN auth.users au ON au.id = u.id
    WHERE 
        (search_term IS NULL OR 
         u.username ILIKE '%' || search_term || '%' OR 
         u.display_name ILIKE '%' || search_term || '%' OR
         au.email ILIKE '%' || search_term || '%') AND
        (status_filter IS NULL OR u.status = status_filter) AND
        (role_filter IS NULL OR 
         (role_filter = 'admin' AND u.is_admin = TRUE) OR
         (role_filter = 'moderator' AND u.is_moderator = TRUE) OR
         (role_filter = 'banned' AND u.is_banned = TRUE) OR
         (role_filter = 'regular' AND NOT u.is_admin AND NOT u.is_moderator AND NOT u.is_banned))
    ORDER BY u.created_at DESC
    LIMIT page_size OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ban/unban users
CREATE OR REPLACE FUNCTION ban_user(
    target_user_id UUID,
    ban_reason TEXT DEFAULT NULL,
    is_ban BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN AS $$
DECLARE
    old_status JSONB;
BEGIN
    -- Check if current user is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;
    
    -- Prevent self-ban
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot ban yourself';
    END IF;
    
    -- Capture old values for audit
    SELECT jsonb_build_object('is_banned', is_banned, 'ban_reason', ban_reason, 'banned_at', banned_at, 'banned_by', banned_by)
    INTO old_status
    FROM public.users WHERE id = target_user_id;
    
    -- Update user ban status
    UPDATE public.users 
    SET 
        is_banned = is_ban,
        ban_reason = CASE WHEN is_ban THEN ban_reason ELSE NULL END,
        banned_at = CASE WHEN is_ban THEN NOW() ELSE NULL END,
        banned_by = CASE WHEN is_ban THEN auth.uid() ELSE NULL END
    WHERE id = target_user_id;
    
    -- Log the action (with affected_user_id)
    PERFORM log_admin_action(
        CASE WHEN is_ban THEN 'ban_user' ELSE 'unban_user' END,
        'users',
        target_user_id,
        target_user_id,  -- affected_user_id
        old_status,
        jsonb_build_object('is_banned', is_ban, 'ban_reason', ban_reason)
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to promote/demote users
CREATE OR REPLACE FUNCTION change_user_role(
    target_user_id UUID,
    new_role TEXT,
    is_admin_role BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
DECLARE
    old_roles JSONB;
BEGIN
    -- Validate new_role
    IF new_role NOT IN ('admin', 'moderator', 'regular') THEN
        RAISE EXCEPTION 'Invalid role: must be admin, moderator, or regular';
    END IF;
    
    -- Check if current user is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;
    
    -- Prevent self-demotion from admin
    IF target_user_id = auth.uid() AND is_admin() AND new_role != 'admin' THEN
        RAISE EXCEPTION 'Cannot demote yourself from admin';
    END IF;
    
    -- Capture old values
    SELECT jsonb_build_object('is_admin', is_admin, 'is_moderator', is_moderator)
    INTO old_roles
    FROM public.users WHERE id = target_user_id;
    
    -- Update user role
    UPDATE public.users 
    SET 
        is_admin = is_admin_role,
        is_moderator = (new_role = 'moderator' AND NOT is_admin_role)
    WHERE id = target_user_id;
    
    -- Log the action
    PERFORM log_admin_action(
        'change_user_role',
        'users',
        target_user_id,
        target_user_id,
        old_roles,
        jsonb_build_object('new_role', new_role, 'is_admin', is_admin_role)
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SERVER MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to get all servers with pagination and filtering
CREATE OR REPLACE FUNCTION get_servers_admin(
    page_size INTEGER DEFAULT 50,
    page_offset INTEGER DEFAULT 0,
    search_term TEXT DEFAULT NULL,
    status_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name VARCHAR(100),
    description TEXT,
    owner_username VARCHAR(50),
    member_count INTEGER,
    is_public BOOLEAN,
    is_verified BOOLEAN,
    is_suspended BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.description,
        u.username,
        s.member_count,
        s.is_public,
        s.is_verified,
        s.is_suspended,
        s.created_at
    FROM public.servers s
    JOIN public.users u ON u.id = s.owner_id
    WHERE 
        (search_term IS NULL OR 
         s.name ILIKE '%' || search_term || '%' OR 
         s.description ILIKE '%' || search_term || '%') AND
        (status_filter IS NULL OR 
         (status_filter = 'suspended' AND s.is_suspended = TRUE) OR
         (status_filter = 'verified' AND s.is_verified = TRUE) OR
         (status_filter = 'public' AND s.is_public = TRUE) OR
         (status_filter = 'private' AND s.is_public = FALSE))
    ORDER BY s.created_at DESC
    LIMIT page_size OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to suspend/unsuspend servers
CREATE OR REPLACE FUNCTION suspend_server(
    server_id UUID,
    suspension_reason TEXT DEFAULT NULL,
    is_suspend BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN AS $$
DECLARE
    old_status JSONB;
    owner_id UUID;
BEGIN
    -- Check if current user is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;
    
    -- Get owner for logging
    SELECT owner_id INTO owner_id FROM public.servers WHERE id = server_id;
    IF owner_id IS NULL THEN
        RAISE EXCEPTION 'Server not found';
    END IF;
    
    -- Capture old values
    SELECT jsonb_build_object('is_suspended', is_suspended, 'suspension_reason', suspension_reason, 'suspended_at', suspended_at, 'suspended_by', suspended_by)
    INTO old_status
    FROM public.servers WHERE id = server_id;
    
    -- Update server suspension status
    UPDATE public.servers 
    SET 
        is_suspended = is_suspend,
        suspension_reason = CASE WHEN is_suspend THEN suspension_reason ELSE NULL END,
        suspended_at = CASE WHEN is_suspend THEN NOW() ELSE NULL END,
        suspended_by = CASE WHEN is_suspend THEN auth.uid() ELSE NULL END
    WHERE id = server_id;
    
    -- Log the action
    PERFORM log_admin_action(
        CASE WHEN is_suspend THEN 'suspend_server' ELSE 'unsuspend_server' END,
        'servers',
        server_id,
        owner_id,  -- affected_user_id (owner)
        old_status,
        jsonb_build_object('is_suspended', is_suspend, 'suspension_reason', suspension_reason)
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify/unverify servers
CREATE OR REPLACE FUNCTION verify_server(
    server_id UUID,
    is_verify BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN AS $$
DECLARE
    old_status BOOLEAN;
    owner_id UUID;
BEGIN
    -- Check if current user is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;
    
    -- Get owner for logging
    SELECT owner_id INTO owner_id FROM public.servers WHERE id = server_id;
    IF owner_id IS NULL THEN
        RAISE EXCEPTION 'Server not found';
    END IF;
    
    -- Capture old value
    SELECT is_verified INTO old_status FROM public.servers WHERE id = server_id;
    
    -- Update server verification status
    UPDATE public.servers 
    SET is_verified = is_verify
    WHERE id = server_id;
    
    -- Log the action
    PERFORM log_admin_action(
        CASE WHEN is_verify THEN 'verify_server' ELSE 'unverify_server' END,
        'servers',
        server_id,
        owner_id,
        jsonb_build_object('is_verified', old_status),
        jsonb_build_object('is_verified', is_verify)
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MESSAGE MODERATION FUNCTIONS
-- =====================================================

-- Function to get reported messages
CREATE OR REPLACE FUNCTION get_reported_messages(
    page_size INTEGER DEFAULT 50,
    page_offset INTEGER DEFAULT 0,
    status_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    report_id UUID,
    message_id UUID,
    message_content TEXT,
    reporter_username VARCHAR(50),
    reported_user_username VARCHAR(50),
    reason VARCHAR(100),
    description TEXT,
    status VARCHAR(20),
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.reported_message_id,
        COALESCE(m.content, '[Deleted]'),  -- Handle deleted messages
        ru.username,
        COALESCE(mu.username, '[Unknown]'),
        r.reason,
        r.description,
        r.status,
        r.created_at
    FROM public.reports r
    JOIN public.users ru ON ru.id = r.reporter_id
    LEFT JOIN public.messages m ON m.id = r.reported_message_id AND NOT m.is_deleted  -- Exclude deleted
    LEFT JOIN public.users mu ON mu.id = m.user_id
    WHERE 
        r.reported_message_id IS NOT NULL AND
        (status_filter IS NULL OR r.status = status_filter)
    ORDER BY r.created_at DESC
    LIMIT page_size OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete message and log action
CREATE OR REPLACE FUNCTION delete_message_admin(
    message_id UUID,
    deletion_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    message_user_id UUID;
    message_content TEXT;
BEGIN
    -- Check if current user is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;
    
    -- Get message details
    SELECT user_id, content INTO message_user_id, message_content
    FROM public.messages
    WHERE id = message_id AND NOT is_deleted;  -- Only undeleted
    
    IF message_user_id IS NULL THEN
        RAISE EXCEPTION 'Message not found or already deleted';
    END IF;
    
    -- Soft delete the message
    UPDATE public.messages 
    SET 
        is_deleted = TRUE,
        deleted_at = NOW(),
        deleted_by = auth.uid(),
        deletion_reason = deletion_reason
    WHERE id = message_id;
    
    -- Log the action
    PERFORM log_admin_action(
        'delete_message',
        'messages',
        message_id,
        message_user_id,
        jsonb_build_object('content', message_content),
        jsonb_build_object('deletion_reason', deletion_reason)
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SYSTEM STATISTICS FUNCTIONS
-- =====================================================

-- Function to get system statistics
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS TABLE (
    total_users BIGINT,
    active_users_24h BIGINT,
    total_servers BIGINT,
    total_messages BIGINT,
    messages_24h BIGINT,
    total_reports BIGINT,
    pending_reports BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM public.users) as total_users,
        (SELECT COUNT(*) FROM public.users WHERE last_seen > NOW() - INTERVAL '24 hours') as active_users_24h,
        (SELECT COUNT(*) FROM public.servers) as total_servers,
        (SELECT COUNT(*) FROM public.messages WHERE NOT is_deleted) as total_messages,
        (SELECT COUNT(*) FROM public.messages WHERE created_at > NOW() - INTERVAL '24 hours' AND NOT is_deleted) as messages_24h,
        (SELECT COUNT(*) FROM public.reports) as total_reports,
        (SELECT COUNT(*) FROM public.reports WHERE status = 'pending') as pending_reports;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user activity over time
CREATE OR REPLACE FUNCTION get_user_activity_stats(days INTEGER DEFAULT 30)
RETURNS TABLE (
    date DATE,
    new_users BIGINT,
    active_users BIGINT,
    messages_sent BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.date,
        COALESCE(new_users.count, 0) as new_users,
        COALESCE(active_users.count, 0) as active_users,
        COALESCE(messages.count, 0) as messages_sent
    FROM (
        SELECT generate_series(
            CURRENT_DATE - INTERVAL '1 day' * days,
            CURRENT_DATE,
            INTERVAL '1 day'
        )::DATE as date
    ) d
    LEFT JOIN (
        SELECT 
            created_at::DATE as date,
            COUNT(*) as count
        FROM public.users
        WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * days
        GROUP BY created_at::DATE
    ) new_users ON new_users.date = d.date
    LEFT JOIN (
        SELECT 
            last_seen::DATE as date,
            COUNT(DISTINCT id) as count
        FROM public.users
        WHERE last_seen >= CURRENT_DATE - INTERVAL '1 day' * days
        GROUP BY last_seen::DATE
    ) active_users ON active_users.date = d.date
    LEFT JOIN (
        SELECT 
            created_at::DATE as date,
            COUNT(*) as count
        FROM public.messages
        WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * days
        AND NOT is_deleted
        GROUP BY created_at::DATE
    ) messages ON messages.date = d.date
    ORDER BY d.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SYSTEM SETTINGS FUNCTIONS
-- =====================================================

-- Function to get system settings
CREATE OR REPLACE FUNCTION get_system_settings()
RETURNS TABLE (
    key VARCHAR(100),
    value JSONB,
    description TEXT,
    is_public BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ss.key,
        ss.value,
        ss.description,
        ss.is_public
    FROM public.system_settings ss
    ORDER BY ss.key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update system setting
CREATE OR REPLACE FUNCTION update_system_setting(
    setting_key VARCHAR(100),
    setting_value JSONB,
    setting_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    old_value JSONB;
BEGIN
    -- Check if current user is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;
    
    -- Capture old value
    SELECT value INTO old_value FROM public.system_settings WHERE key = setting_key;
    
    -- Update or insert setting
    INSERT INTO public.system_settings (key, value, description, updated_by)
    VALUES (setting_key, setting_value, setting_description, auth.uid())
    ON CONFLICT (key) 
    DO UPDATE SET 
        value = EXCLUDED.value,
        description = COALESCE(EXCLUDED.description, system_settings.description),
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW();
    
    -- Log the action
    PERFORM log_admin_action(
        'update_system_setting',
        'system_settings',
        NULL,
        NULL,
        jsonb_build_object('key', setting_key, 'old_value', old_value),
        jsonb_build_object('key', setting_key, 'value', setting_value)
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- AUDIT LOG FUNCTIONS
-- =====================================================

-- Function to get audit logs with filtering
CREATE OR REPLACE FUNCTION get_audit_logs(
    page_size INTEGER DEFAULT 100,
    page_offset INTEGER DEFAULT 0,
    action_filter TEXT DEFAULT NULL,
    user_filter UUID DEFAULT NULL,
    date_from TIMESTAMPTZ DEFAULT NULL,
    date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    action VARCHAR(50),
    table_name VARCHAR(50),
    record_id UUID,
    user_username VARCHAR(50),
    admin_username VARCHAR(50),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.action,
        al.table_name,
        al.record_id,
        COALESCE(u.username, '[Unknown]'),
        COALESCE(a.username, '[Unknown]'),
        al.old_values,
        al.new_values,
        al.ip_address,
        al.created_at
    FROM public.audit_logs al
    LEFT JOIN public.users u ON u.id = al.user_id
    LEFT JOIN public.users a ON a.id = al.admin_id
    WHERE 
        (action_filter IS NULL OR al.action = action_filter) AND
        (user_filter IS NULL OR al.user_id = user_filter) AND
        (date_from IS NULL OR al.created_at >= date_from) AND
        (date_to IS NULL OR al.created_at <= date_to)
    ORDER BY al.created_at DESC
    LIMIT page_size OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- END OF ADMIN FUNCTIONS
-- =====================================================

-- =====================================================
-- RECOMMENDATIONS
-- =====================================================
/*
Additional Schema Enhancements (Run separately if needed):
- Add ENUM for roles: CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'regular'); ALTER TABLE users ADD COLUMN role user_role;
- Index for audits: CREATE INDEX idx_audit_logs_created_action ON public.audit_logs(created_at, action); (Already suggested in schema)
- Trigger for message_count: CREATE OR REPLACE FUNCTION update_user_message_count() RETURNS TRIGGER AS $$ BEGIN IF TG_OP = 'INSERT' THEN UPDATE public.users SET message_count = message_count + 1, last_message_at = NOW() WHERE id = NEW.user_id; ELSIF TG_OP = 'DELETE' THEN UPDATE public.users SET message_count = message_count - 1 WHERE id = OLD.user_id; END IF; RETURN COALESCE(NEW, OLD); END; $$ LANGUAGE plpgsql; CREATE TRIGGER update_message_count AFTER INSERT OR DELETE ON public.messages FOR EACH ROW EXECUTE FUNCTION update_user_message_count();
- Test: As admin, run SELECT ban_user('some-uuid', 'Test ban'); then SELECT * FROM get_audit_logs();
*/