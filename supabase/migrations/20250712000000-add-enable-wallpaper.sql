-- Add enable_wallpaper column to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS enable_wallpaper BOOLEAN NOT NULL DEFAULT TRUE;

-- Update existing records to have enable_wallpaper = true
UPDATE public.user_settings 
SET enable_wallpaper = TRUE 
WHERE enable_wallpaper IS NULL; 