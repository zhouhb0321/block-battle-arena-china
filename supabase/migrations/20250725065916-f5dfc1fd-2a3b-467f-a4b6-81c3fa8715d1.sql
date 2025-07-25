-- Fix remaining critical security issues from linter

-- 1. Fix RLS disabled issues - Enable RLS on all public tables
ALTER TABLE public.game_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_seasons ENABLE ROW LEVEL SECURITY;

-- 2. Fix function search_path issues for existing functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update user profile
  INSERT INTO public.user_profiles (id, username, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'Player'), NEW.email)
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email;
  
  -- Create user settings with default values
  INSERT INTO public.user_settings (
    user_id, 
    das, 
    arr, 
    sdf, 
    controls, 
    enable_ghost, 
    enable_sound, 
    master_volume,
    background_music,
    music_volume,
    back_to_menu
  )
  VALUES (
    NEW.id,
    167,
    33,
    20,
    '{"hold": "KeyC", "pause": "Escape", "hardDrop": "Space", "moveLeft": "ArrowLeft", "softDrop": "ArrowDown", "moveRight": "ArrowRight", "rotate180": "KeyA", "rotateClockwise": "ArrowUp", "rotateCounterclockwise": "KeyZ", "backToMenu": "KeyB"}'::jsonb,
    true,
    true,
    50,
    '',
    30,
    'KeyB'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;