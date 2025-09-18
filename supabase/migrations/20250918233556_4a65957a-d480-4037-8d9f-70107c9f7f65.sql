-- Fix critical data exposure issues by updating RLS policies

-- 1. Fix game_matches table - remove public access, only allow players to view their own matches
DROP POLICY IF EXISTS "Users can view public match data" ON public.game_matches;

CREATE POLICY "Users can view their own match data" 
ON public.game_matches 
FOR SELECT 
USING ((player1_id = auth.uid()) OR (player2_id = auth.uid()));

-- 2. Fix league_rankings table - require authentication
DROP POLICY IF EXISTS "Users can view league rankings" ON public.league_rankings;

CREATE POLICY "Authenticated users can view league rankings" 
ON public.league_rankings 
FOR SELECT 
TO authenticated
USING (true);

-- 3. Make featured replays require authentication to prevent harassment
DROP POLICY IF EXISTS "Featured replays are public" ON public.compressed_replays;

CREATE POLICY "Authenticated users can view featured replays" 
ON public.compressed_replays 
FOR SELECT 
TO authenticated
USING ((is_featured = true) OR (is_world_record = true));

-- 4. Add session timeout tracking table
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    session_token text NOT NULL UNIQUE,
    last_activity timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '2 hours'),
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own sessions
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions 
FOR SELECT 
USING (user_id = auth.uid());

-- Users can update their own sessions (for activity tracking)
CREATE POLICY "Users can update their own sessions" 
ON public.user_sessions 
FOR UPDATE 
USING (user_id = auth.uid());

-- System can manage sessions
CREATE POLICY "System can manage sessions" 
ON public.user_sessions 
FOR ALL 
USING (auth.role() = 'service_role');

-- 5. Create function to clean expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.user_sessions 
    WHERE expires_at < now();
END;
$$;

-- 6. Add enhanced security logging for admin actions
ALTER TABLE public.security_events 
ADD COLUMN IF NOT EXISTS severity text DEFAULT 'info',
ADD COLUMN IF NOT EXISTS source text DEFAULT 'system',
ADD COLUMN IF NOT EXISTS session_id text;

-- Create index for better performance on security queries
CREATE INDEX IF NOT EXISTS idx_security_events_user_type 
ON public.security_events(user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_activity 
ON public.user_sessions(user_id, last_activity DESC);