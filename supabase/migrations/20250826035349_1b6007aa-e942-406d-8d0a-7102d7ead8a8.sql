-- Create trigger to automatically set username on compressed_replays insert
CREATE TRIGGER set_compressed_replay_username
  BEFORE INSERT ON public.compressed_replays
  FOR EACH ROW
  EXECUTE FUNCTION public.set_replay_username();