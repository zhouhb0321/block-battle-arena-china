
-- 1. Fix password_reset_tokens: restrict to service_role only
DROP POLICY IF EXISTS "System can manage password reset tokens" ON password_reset_tokens;
CREATE POLICY "Service role manages tokens" ON password_reset_tokens
  FOR ALL TO public USING (auth.role() = 'service_role');

-- 2. Fix user_profiles: restrict privileged column updates
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update own non-privileged fields" ON user_profiles
  FOR UPDATE TO public
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND subscription_tier IS NOT DISTINCT FROM (SELECT up.subscription_tier FROM user_profiles up WHERE up.id = auth.uid())
    AND user_type IS NOT DISTINCT FROM (SELECT up.user_type FROM user_profiles up WHERE up.id = auth.uid())
    AND rank IS NOT DISTINCT FROM (SELECT up.rank FROM user_profiles up WHERE up.id = auth.uid())
  );

-- 3. Fix league_rankings: remove user UPDATE
DROP POLICY IF EXISTS "Users can update their own ranking" ON league_rankings;

-- 4. Fix ranked_matches: remove user UPDATE  
DROP POLICY IF EXISTS "Users can update their own matches" ON ranked_matches;

-- 5. Fix advertisements: remove broad authenticated policy
DROP POLICY IF EXISTS "Authenticated users can view all advertisements" ON advertisements;

-- 6. Fix overly permissive INSERT policies
DROP POLICY IF EXISTS "System can insert battle records" ON battle_records;
CREATE POLICY "Authenticated can insert battle records" ON battle_records
  FOR INSERT TO public WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "System can insert game records" ON match_games;
CREATE POLICY "Authenticated can insert game records" ON match_games
  FOR INSERT TO public WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "System can insert security events" ON security_events;
CREATE POLICY "Authenticated or service can insert security events" ON security_events
  FOR INSERT TO public WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "System can insert user badges" ON user_badges;
CREATE POLICY "Authenticated can insert user badges" ON user_badges
  FOR INSERT TO public WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can insert user session logs" ON user_session_logs;
CREATE POLICY "Authenticated can insert session logs" ON user_session_logs
  FOR INSERT TO public WITH CHECK (auth.role() = 'authenticated');
