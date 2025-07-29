-- Add undo_steps field to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN undo_steps integer DEFAULT 50;