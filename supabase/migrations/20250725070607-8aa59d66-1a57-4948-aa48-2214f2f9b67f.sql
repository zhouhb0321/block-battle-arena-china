-- Fix remaining RLS disabled tables
ALTER TABLE public.game_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_replays ENABLE ROW LEVEL SECURITY;