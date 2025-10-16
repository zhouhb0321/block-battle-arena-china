-- Fix 1: Add INSERT policy for user_sessions (fixing RLS violation)
CREATE POLICY "Users can create their own sessions"
ON user_sessions
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Fix 2: Create security definer function to prevent infinite recursion in battle_participants
CREATE OR REPLACE FUNCTION public.can_access_battle_room(
  _room_id uuid,
  _user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM battle_rooms
    WHERE id = _room_id
      AND (created_by = _user_id OR EXISTS (
        SELECT 1 FROM battle_participants
        WHERE room_id = _room_id AND user_id = _user_id
      ))
  );
$$;

-- Drop old recursive policy and create new one using security definer function
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON battle_participants;

CREATE POLICY "Users can view participants in accessible rooms"
ON battle_participants
FOR SELECT
USING (public.can_access_battle_room(room_id, auth.uid()));

-- Fix 3: Implement session token hashing using pgcrypto
-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add column for hashed tokens
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS session_token_hash text;

-- Create index on hashed tokens for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(session_token_hash);

-- Create function to hash and insert session tokens securely
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
  -- Hash the session token
  _token_hash := encode(digest(_session_token, 'sha256'), 'hex');
  
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
  ON CONFLICT (user_id, session_token)
  DO UPDATE SET
    session_token_hash = _token_hash,
    last_activity = _last_activity,
    expires_at = _expires_at,
    user_agent = _user_agent;
END;
$$;

-- Fix 4: Tighten user_profiles RLS to block anonymous access
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Block anonymous access to user_profiles" ON user_profiles;

CREATE POLICY "Authenticated users can view their own profile"
ON user_profiles
FOR SELECT
USING (auth.uid() = id AND auth.role() = 'authenticated');

CREATE POLICY "Admins can view all profiles"
ON user_profiles
FOR SELECT
USING (public.is_admin(auth.uid()) AND auth.role() = 'authenticated');

-- Fix 5: Tighten subscribers RLS policies
DROP POLICY IF EXISTS "Users can view their own subscription data only" ON subscribers;
DROP POLICY IF EXISTS "Service can manage subscriptions" ON subscribers;
DROP POLICY IF EXISTS "Block anonymous access to subscribers" ON subscribers;

CREATE POLICY "Authenticated users can view their own subscription"
ON subscribers
FOR SELECT
USING (
  auth.role() = 'authenticated' AND
  user_id = auth.uid()
);

CREATE POLICY "Service role can manage subscriptions"
ON subscribers
FOR ALL
USING (auth.role() = 'service_role');

-- Create function to safely check subscription status without exposing sensitive data
CREATE OR REPLACE FUNCTION public.get_user_subscription_tier(_user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(subscription_tier, 'free')
  FROM subscribers
  WHERE user_id = _user_id AND subscribed = true
  LIMIT 1;
$$;

-- Fix 6: Ensure authenticated-only access to user_sessions
DROP POLICY IF EXISTS "Block anonymous access to user_sessions" ON user_sessions;

CREATE POLICY "Only authenticated users can access sessions"
ON user_sessions
FOR ALL
USING (auth.role() = 'authenticated' AND user_id = auth.uid())
WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());