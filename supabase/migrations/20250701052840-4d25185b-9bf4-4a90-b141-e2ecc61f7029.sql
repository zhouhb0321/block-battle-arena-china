
-- Add ghost_opacity column to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN ghost_opacity integer DEFAULT 50;

-- Update existing records to have the default value
UPDATE public.user_settings 
SET ghost_opacity = 50 
WHERE ghost_opacity IS NULL;
