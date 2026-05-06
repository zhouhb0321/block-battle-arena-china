
DROP POLICY IF EXISTS "Authenticated users can delete music files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete wallpaper files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload music files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload wallpaper files" ON storage.objects;

DROP POLICY IF EXISTS "Users can insert own badges" ON public.user_badges;

CREATE OR REPLACE FUNCTION public.award_user_badge(_badge_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _exists boolean;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'auth required');
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.badges WHERE badge_id = _badge_id) INTO _exists;
  IF NOT _exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'unknown badge');
  END IF;
  INSERT INTO public.user_badges (user_id, badge_id)
  VALUES (_uid, _badge_id)
  ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.award_user_badge(text) FROM public;
GRANT EXECUTE ON FUNCTION public.award_user_badge(text) TO authenticated;

DROP POLICY IF EXISTS "Anyone can view active advertisements" ON public.advertisements;
DROP POLICY IF EXISTS "Everyone can view active advertisements" ON public.advertisements;

CREATE POLICY "Admins can view advertisements"
ON public.advertisements
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_public_ads(_position text)
RETURNS TABLE(
  id uuid,
  title text,
  content text,
  image_url text,
  target_url text,
  ad_position text,
  region text,
  language text,
  frequency_cap integer,
  start_date timestamptz,
  end_date timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.title, a.content, a.image_url, a.target_url, a.position AS ad_position,
         a.region, a.language, a.frequency_cap, a.start_date, a.end_date
  FROM public.advertisements a
  WHERE a.is_active = true
    AND a.position = _position
    AND (a.end_date IS NULL OR a.end_date >= now())
  ORDER BY a.priority DESC NULLS LAST, a.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_public_ads(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_ads(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can insert impressions" ON public.ad_impressions;
DROP POLICY IF EXISTS "Anyone can insert clicks" ON public.ad_clicks;

CREATE POLICY "Insert own impressions"
ON public.ad_impressions
FOR INSERT
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Insert own clicks"
ON public.ad_clicks
FOR INSERT
WITH CHECK (user_id IS NULL OR user_id = auth.uid());
