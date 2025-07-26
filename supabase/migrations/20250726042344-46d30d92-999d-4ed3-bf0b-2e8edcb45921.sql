-- Add wallpaper change interval setting to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN wallpaper_change_interval integer DEFAULT 120;

-- Update the comment for clarity
COMMENT ON COLUMN public.user_settings.wallpaper_change_interval IS 'Wallpaper change interval in seconds (120, 180, 300)';