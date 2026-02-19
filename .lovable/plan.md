

# Plan: Clean Up Leaderboard Data and Fix Rankings

## Current Problems

1. **6 zero-score junk replays** in the database (score=0, lines=0) — these are abandoned/incomplete games that should not appear on the leaderboard
2. **`leaderboard_rank` values are incorrect** — e.g., a replay ranked 12th by score has `leaderboard_rank: 36`
3. **`is_personal_best` is false for all replays** — each user's top score should be marked as their personal best

## Replay Uniqueness

The replay deduplication fix (resetting state in `ReplayPreparationDialog` when `replayId` changes) is already deployed in the code. Each replay loads fresh data when selected.

## Data Cleanup Steps

### Step 1: Delete zero-score junk replays

Remove 6 replays with `final_score = 0 AND final_lines = 0` — these are clearly incomplete games that shouldn't be on the leaderboard.

### Step 2: Update `leaderboard_rank` for all timeAttack2 replays

Recalculate using `ROW_NUMBER() OVER (ORDER BY final_score DESC)` to assign correct sequential rankings.

### Step 3: Mark personal bests

For each user, mark their highest-scoring replay per game mode as `is_personal_best = true`.

## Technical Details (SQL Migration)

```sql
-- 1. Delete zero-score junk replays
DELETE FROM compressed_replays 
WHERE final_score = 0 AND final_lines = 0;

-- 2. Recalculate leaderboard_rank for timeAttack2
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
```

This migration runs as service role so it has full table access regardless of RLS policies.

## Files Changed

| File | Change |
|------|--------|
| New migration SQL | Delete junk data, recalculate ranks, mark personal bests |

No code changes needed — the leaderboard UI already sorts by score/time correctly. The `leaderboard_rank` column is now accurate for display purposes.

