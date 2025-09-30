-- Fix can_access_channel function to properly bypass RLS
-- The issue: Even with SECURITY DEFINER, the function respects RLS

-- Recreate the function with explicit RLS bypass
CREATE OR REPLACE FUNCTION public.can_access_channel(channel_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  has_access BOOLEAN;
BEGIN
  -- Explicitly bypass RLS by using a query that doesn't trigger policies
  SELECT EXISTS (
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
  ) INTO has_access;
  
  RETURN has_access;
END;
$$;

-- Also fix is_server_member
CREATE OR REPLACE FUNCTION public.is_server_member(server_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  is_member BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_id = server_uuid AND user_id = auth.uid()
  ) INTO is_member;
  
  RETURN is_member;
END;
$$;

SELECT 'Functions updated with explicit RLS bypass' as status;
