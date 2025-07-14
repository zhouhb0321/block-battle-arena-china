
-- Add new columns to user_settings table for the new features
ALTER TABLE user_settings 
ADD COLUMN wallpaper_opacity integer DEFAULT 100,
ADD COLUMN auto_play_music boolean DEFAULT false,
ADD COLUMN loop_music boolean DEFAULT true,
ADD COLUMN enable_line_animation boolean DEFAULT true,
ADD COLUMN enable_achievement_animation boolean DEFAULT true,
ADD COLUMN enable_landing_effect boolean DEFAULT true;
