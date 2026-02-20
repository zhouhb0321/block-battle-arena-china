-- 1. Delete zero-score junk replays
DELETE FROM compressed_replays 
WHERE final_score = 0 AND final_lines = 0;

-- 2. Recalculate leaderboard_rank for timeAttack2/ultra2min
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY final_score DESC) as true_rank
  FROM compressed_replays 
  WHERE game_mode IN ('timeAttack2', 'ultra2min') AND version >= '3.0'
)
UPDATE compressed_replays SET leaderboard_rank = ranked.true_rank
FROM ranked WHERE compressed_replays.id = ranked.id;

-- 3. Reset all personal bests, then mark the correct ones
UPDATE compressed_replays SET is_personal_best = false;

WITH best_per_user AS (
  SELECT DISTINCT ON (user_id, game_mode) id
  FROM compressed_replays
  WHERE game_mode IN ('timeAttack2', 'ultra2min')
  ORDER BY user_id, game_mode, final_score DESC
)
UPDATE compressed_replays SET is_personal_best = true
WHERE id IN (SELECT id FROM best_per_user);