-- Fix function search path security issue
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create trigger to automatically set username on insert
CREATE TRIGGER set_replay_username_trigger
    BEFORE INSERT ON public.compressed_replays
    FOR EACH ROW
    EXECUTE FUNCTION public.set_replay_username();