
-- 1. Fix user_badges: restrict to own user_id
DROP POLICY IF EXISTS "Authenticated can insert user badges" ON user_badges;
CREATE POLICY "Users can insert own badges" ON user_badges
  FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

-- 2. Fix user_profiles: restrict UPDATE to safe fields only
DROP POLICY IF EXISTS "Users can update own non-privileged fields" ON user_profiles;
CREATE POLICY "Users can update own safe fields" ON user_profiles
  FOR UPDATE TO public
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND subscription_tier IS NOT DISTINCT FROM (SELECT up.subscription_tier FROM user_profiles up WHERE up.id = auth.uid())
    AND user_type IS NOT DISTINCT FROM (SELECT up.user_type FROM user_profiles up WHERE up.id = auth.uid())
    AND rank IS NOT DISTINCT FROM (SELECT up.rank FROM user_profiles up WHERE up.id = auth.uid())
    AND rating IS NOT DISTINCT FROM (SELECT up.rating FROM user_profiles up WHERE up.id = auth.uid())
    AND games_played IS NOT DISTINCT FROM (SELECT up.games_played FROM user_profiles up WHERE up.id = auth.uid())
    AND games_won IS NOT DISTINCT FROM (SELECT up.games_won FROM user_profiles up WHERE up.id = auth.uid())
    AND total_score IS NOT DISTINCT FROM (SELECT up.total_score FROM user_profiles up WHERE up.id = auth.uid())
    AND total_lines IS NOT DISTINCT FROM (SELECT up.total_lines FROM user_profiles up WHERE up.id = auth.uid())
    AND best_pps IS NOT DISTINCT FROM (SELECT up.best_pps FROM user_profiles up WHERE up.id = auth.uid())
    AND best_apm IS NOT DISTINCT FROM (SELECT up.best_apm FROM user_profiles up WHERE up.id = auth.uid())
    AND email IS NOT DISTINCT FROM (SELECT up.email FROM user_profiles up WHERE up.id = auth.uid())
    AND friend_limit IS NOT DISTINCT FROM (SELECT up.friend_limit FROM user_profiles up WHERE up.id = auth.uid())
    AND username_changes_used IS NOT DISTINCT FROM (SELECT up.username_changes_used FROM user_profiles up WHERE up.id = auth.uid())
    AND username_changes_count IS NOT DISTINCT FROM (SELECT up.username_changes_count FROM user_profiles up WHERE up.id = auth.uid())
  );

-- 3. Fix battle_rooms: hide room_password via security definer function
CREATE OR REPLACE FUNCTION public.get_waiting_rooms()
RETURNS TABLE (
  id uuid, room_code varchar, mode varchar, status varchar,
  max_players int, current_players int, created_by uuid,
  created_at timestamptz, team_mode boolean, allow_spectators boolean,
  custom_settings jsonb, settings jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, room_code, mode, status, max_players, current_players,
         created_by, created_at, team_mode, allow_spectators,
         custom_settings, settings
  FROM battle_rooms WHERE status = 'waiting';
$$;

-- 4. Fix battle_records INSERT
DROP POLICY IF EXISTS "Authenticated can insert battle records" ON battle_records;
CREATE POLICY "Participants can insert battle records" ON battle_records
  FOR INSERT TO public WITH CHECK (auth.uid() = winner_id OR auth.uid() = loser_id);

-- 5. Fix match_games INSERT
DROP POLICY IF EXISTS "Authenticated can insert game records" ON match_games;
CREATE POLICY "Participants can insert game records" ON match_games
  FOR INSERT TO public WITH CHECK (auth.uid() = winner_id OR auth.uid() = loser_id);

-- 6. Fix user_session_logs INSERT
DROP POLICY IF EXISTS "Authenticated can insert session logs" ON user_session_logs;
CREATE POLICY "Users can insert own session logs" ON user_session_logs
  FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
