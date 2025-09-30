-- Security fixes for RLS policies
-- These fix the issues introduced while solving recursion

-- ============================================
-- FIX 1: SERVERS TABLE - Members can't see their servers!
-- ============================================

-- Create a SECURITY DEFINER function that bypasses RLS to check membership
CREATE OR REPLACE FUNCTION public.is_member_of_server(server_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  -- This function runs with elevated privileges and bypasses RLS
  SELECT EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_id = server_uuid AND user_id = auth.uid()
  );
$$;

-- Update servers SELECT policy to use the function
DROP POLICY IF EXISTS "View servers" ON public.servers;

CREATE POLICY "View servers" ON public.servers
  FOR SELECT
  USING (
    is_public = true 
    OR owner_id = auth.uid()
    OR public.is_member_of_server(id)
  );

-- ============================================
-- FIX 2: CHANNELS TABLE - Should check membership
-- ============================================

DROP POLICY IF EXISTS "Anyone can view channels" ON public.channels;

CREATE POLICY "View channels if member" ON public.channels
  FOR SELECT
  USING (
    -- Can view if you're a member of the server (uses SECURITY DEFINER function)
    public.is_member_of_server(server_id)
    -- Or if it's a public server
    OR EXISTS (
      SELECT 1 FROM public.servers s 
      WHERE s.id = channels.server_id AND s.is_public = true
    )
  );

-- ============================================
-- FIX 3: USERS TABLE - Prevent updating sensitive flags
-- ============================================

-- Add a trigger to prevent users from updating sensitive flags
CREATE OR REPLACE FUNCTION public.prevent_user_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow updates if not changing sensitive flags, OR if user is already admin
  IF (NEW.is_admin != OLD.is_admin 
      OR NEW.is_moderator != OLD.is_moderator 
      OR NEW.is_banned != OLD.is_banned)
     AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  THEN
    RAISE EXCEPTION 'You cannot modify admin, moderator, or banned status';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS prevent_privilege_escalation ON public.users;

-- Create the trigger
CREATE TRIGGER prevent_privilege_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_privilege_escalation();

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Security fixes applied:' as status;
SELECT '1. Servers: Members can now see their servers (via SECURITY DEFINER function)' as fix;
SELECT '2. Channels: Now check server membership properly' as fix;
SELECT '3. Users: Trigger prevents privilege escalation' as fix;
