
-- Add enable_wallpaper field to user_settings table
ALTER TABLE user_settings ADD COLUMN enable_wallpaper BOOLEAN DEFAULT true;
