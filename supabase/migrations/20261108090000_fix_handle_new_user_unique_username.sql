-- Fix: new-user trigger inserted the literal username 'Player' for every signup.
-- user_profiles.username is UNIQUE, so the second signup failed with
-- "Database error saving new user". Make the username unique and isolate
-- profile insert failures from settings/role provisioning.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username text;
  final_username text;
  suffix text := substr(replace(NEW.id::text, '-', ''), 1, 6);
BEGIN
  base_username := NULLIF(btrim(NEW.raw_user_meta_data->>'username'), '');
  IF base_username IS NULL THEN
    base_username := 'Player';
  END IF;

  -- Profile insert: fall back to a unique suffix if the username is taken.
  BEGIN
    INSERT INTO public.user_profiles (id, username, email)
    VALUES (NEW.id, base_username, NEW.email)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  EXCEPTION WHEN unique_violation THEN
    final_username := base_username || '_' || suffix;
    INSERT INTO public.user_profiles (id, username, email)
    VALUES (NEW.id, final_username, NEW.email)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  END;

  INSERT INTO public.user_settings (
    user_id, das, arr, sdf, controls, enable_ghost, enable_sound,
    master_volume, background_music, music_volume, back_to_menu
  )
  VALUES (
    NEW.id, 167, 33, 20,
    '{"hold":"KeyC","pause":"Escape","hardDrop":"Space","moveLeft":"ArrowLeft","softDrop":"ArrowDown","moveRight":"ArrowRight","rotate180":"KeyA","rotateClockwise":"ArrowUp","rotateCounterclockwise":"KeyZ","backToMenu":"KeyB"}'::jsonb,
    true, true, 50, '', 30, 'KeyB'
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
