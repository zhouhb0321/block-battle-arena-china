-- Add username field to compressed_replays for public display
-- This avoids complex joins with user_profiles in RLS policies
ALTER TABLE public.compressed_replays 
ADD COLUMN username TEXT;

-- Update the column with current usernames for existing records
UPDATE public.compressed_replays 
SET username = up.username 
FROM public.user_profiles up 
WHERE compressed_replays.user_id = up.id;

-- Create function to automatically set username on insert
CREATE OR REPLACE FUNCTION public.set_replay_username()
RETURNS TRIGGER AS $$
BEGIN
    SELECT username INTO NEW.username 
    FROM public.user_profiles 
    WHERE id = NEW.user_id;
    
    -- Fallback to 'Player' if username not found
    IF NEW.username IS NULL THEN
        NEW.username := 'Player';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;