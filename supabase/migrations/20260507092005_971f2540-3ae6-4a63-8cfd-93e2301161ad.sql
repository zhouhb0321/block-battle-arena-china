
-- ============================================================
-- Realtime RLS: scope channel access to legitimate participants
-- ============================================================
-- realtime.messages already has RLS enabled but no policies => deny-all.
-- Add narrow policies so private chat and battle rooms work, while still
-- preventing arbitrary authenticated users from snooping on other topics.

-- Helper: is the current user one of the two participants in a pm:<a>:<b> topic?
CREATE OR REPLACE FUNCTION public.realtime_is_pm_participant(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parts text[];
  uid_text text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  IF _topic IS NULL OR position('pm:' in _topic) <> 1 THEN
    RETURN false;
  END IF;
  parts := string_to_array(substring(_topic from 4), ':');
  IF array_length(parts, 1) <> 2 THEN
    RETURN false;
  END IF;
  uid_text := auth.uid()::text;
  RETURN uid_text = parts[1] OR uid_text = parts[2];
END;
$$;

REVOKE EXECUTE ON FUNCTION public.realtime_is_pm_participant(text) FROM anon, authenticated, public;

-- Helper: is the current user a participant or spectator in room:<uuid>?
CREATE OR REPLACE FUNCTION public.realtime_is_room_member(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  IF _topic IS NULL OR position('room:' in _topic) <> 1 THEN
    RETURN false;
  END IF;
  BEGIN
    rid := substring(_topic from 6)::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;
  RETURN EXISTS (
    SELECT 1 FROM battle_participants WHERE room_id = rid AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM room_spectators WHERE room_id = rid AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM battle_rooms WHERE id = rid AND created_by = auth.uid()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.realtime_is_room_member(text) FROM anon, authenticated, public;

-- Drop any pre-existing policies (idempotent)
DROP POLICY IF EXISTS "Realtime: private chat participants only" ON realtime.messages;
DROP POLICY IF EXISTS "Realtime: battle room members only" ON realtime.messages;

-- Allow private chat topics for the two participants
CREATE POLICY "Realtime: private chat participants only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.realtime_is_pm_participant((SELECT realtime.topic())));

CREATE POLICY "Realtime: private chat participants only insert"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.realtime_is_pm_participant((SELECT realtime.topic())));

-- Allow battle room topics for room members/spectators/creator
CREATE POLICY "Realtime: battle room members only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.realtime_is_room_member((SELECT realtime.topic())));

CREATE POLICY "Realtime: battle room members only insert"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.realtime_is_room_member((SELECT realtime.topic())));
