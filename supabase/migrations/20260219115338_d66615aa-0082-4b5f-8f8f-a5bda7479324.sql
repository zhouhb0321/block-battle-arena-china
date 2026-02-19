-- Fix: All SELECT policies on compressed_replays are RESTRICTIVE (AND logic)
-- They need to be PERMISSIVE (OR logic) so ANY matching policy grants access

-- Drop all existing RESTRICTIVE SELECT policies
DROP POLICY IF EXISTS "Users can view their own replays" ON compressed_replays;
DROP POLICY IF EXISTS "Authenticated users can view leaderboard replays" ON compressed_replays;
DROP POLICY IF EXISTS "Anyone can view featured replays" ON compressed_replays;

-- Recreate as PERMISSIVE (default) - OR logic
CREATE POLICY "Users can view their own replays"
  ON compressed_replays FOR SELECT
  USING (user_id = auth.uid() OR opponent_id = auth.uid());

CREATE POLICY "Authenticated users can view leaderboard replays"
  ON compressed_replays FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    game_mode IN ('sprint40', 'timeAttack2', 'ultra2min', '40lines', 'sprint')
  );

CREATE POLICY "Anyone can view featured replays"
  ON compressed_replays FOR SELECT
  USING (is_featured = true OR is_world_record = true);