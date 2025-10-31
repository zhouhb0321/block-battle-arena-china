-- Fix digest function type casting issue in upsert_user_session
CREATE OR REPLACE FUNCTION public.upsert_user_session(
  _user_id uuid,
  _session_token text,
  _last_activity timestamptz,
  _expires_at timestamptz,
  _user_agent text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token_hash text;
BEGIN
  -- Hash the session token with explicit type casting
  _token_hash := encode(digest(_session_token::bytea, 'sha256'::text), 'hex');
  
  -- Upsert with hashed token
  INSERT INTO user_sessions (
    user_id,
    session_token,
    session_token_hash,
    last_activity,
    expires_at,
    user_agent
  ) VALUES (
    _user_id,
    _session_token,
    _token_hash,
    _last_activity,
    _expires_at,
    _user_agent
  )
  ON CONFLICT (session_token)
  DO UPDATE SET
    user_id = _user_id,
    session_token_hash = _token_hash,
    last_activity = _last_activity,
    expires_at = _expires_at,
    user_agent = _user_agent;
END;
$$;

-- Ensure session_token is unique
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_sessions_session_token_key'
  ) THEN
    ALTER TABLE user_sessions 
    ADD CONSTRAINT user_sessions_session_token_key UNIQUE (session_token);
  END IF;
END $$;

-- Fix RLS policies for user_sessions
DROP POLICY IF EXISTS "Only authenticated users can access sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can create their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;

-- Create comprehensive policy for session management
CREATE POLICY "Users can manage their own sessions"
ON user_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow service role full access
CREATE POLICY "Service role can manage all sessions"
ON user_sessions
FOR ALL
USING (auth.role() = 'service_role');
