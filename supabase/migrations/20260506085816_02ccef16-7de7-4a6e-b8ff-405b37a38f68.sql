
-- 1. SUBSCRIBERS: prevent privilege escalation. Replace permissive UPDATE policy with one
-- that forbids changes to paid/billing/limit fields via WITH CHECK comparison to current row.
DROP POLICY IF EXISTS "Users can update non-sensitive subscription fields" ON public.subscribers;

CREATE POLICY "Users can update non-sensitive subscription fields"
ON public.subscribers
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (user_id = auth.uid() OR (email = auth.email() AND user_id IS NULL))
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (user_id = auth.uid() OR (email = auth.email() AND user_id IS NULL))
  -- Lock down billing/privilege fields against client tampering
  AND subscription_tier IS NOT DISTINCT FROM (
    SELECT s.subscription_tier FROM public.subscribers s WHERE s.id = subscribers.id
  )
  AND subscribed IS NOT DISTINCT FROM (
    SELECT s.subscribed FROM public.subscribers s WHERE s.id = subscribers.id
  )
  AND stripe_customer_id IS NOT DISTINCT FROM (
    SELECT s.stripe_customer_id FROM public.subscribers s WHERE s.id = subscribers.id
  )
  AND friend_limit IS NOT DISTINCT FROM (
    SELECT s.friend_limit FROM public.subscribers s WHERE s.id = subscribers.id
  )
  AND username_changes_used IS NOT DISTINCT FROM (
    SELECT s.username_changes_used FROM public.subscribers s WHERE s.id = subscribers.id
  )
  AND subscription_end IS NOT DISTINCT FROM (
    SELECT s.subscription_end FROM public.subscribers s WHERE s.id = subscribers.id
  )
);

-- 2. STORAGE: drop broad listing policies on public buckets. Public CDN URLs still work.
DROP POLICY IF EXISTS "Anyone can view ad images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view music files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view wallpapers" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for music files" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for wallpaper files" ON storage.objects;

-- 3. SECURITY DEFINER functions: revoke EXECUTE from anon/authenticated/public for
-- internal trigger/maintenance/helper functions that should never be called directly.
REVOKE EXECUTE ON FUNCTION public.log_security_event() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_replay_username() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_sessions() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_rooms() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_subscribers_access() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_elo_change(integer, integer, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_user_session(uuid, text, timestamptz, timestamptz, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_subscribers_safe() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_subscription_status(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_subscription_tier(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_waiting_rooms() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.join_room_by_code(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.award_user_badge(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_access_battle_room(uuid, uuid) FROM anon, PUBLIC;
