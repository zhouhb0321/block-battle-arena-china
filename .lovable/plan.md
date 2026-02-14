

# Plan: Fix Replay System - Correct Per-Replay Loading + Consistent Layout

## Problems Identified

### Problem 1: "All replays point to same game"
**Root Cause**: RLS policy conflict on `compressed_replays`. All SELECT policies are **RESTRICTIVE** (AND logic), meaning:
- Policy A: `user_id = auth.uid() OR opponent_id = auth.uid()`
- Policy B: `is_featured = true OR is_world_record = true`

Both must pass simultaneously, so non-featured/non-world-record replays from other users are blocked. For the leaderboard (which queries ALL users' replays), only replays that are both owned-by-current-user AND featured/world-record would return. Since most replays are neither featured nor world records, the leaderboard likely returns very few or inconsistent results.

Additionally, `ReplaySystem.tsx` opens `SimpleReplayPlayer` without a `key` prop, so React may not remount when switching between replays.

### Problem 2: Replay layout doesn't match main game
The replay players (`SimpleReplayPlayer` and `ReplayPlayerV4Unified`) use completely different layouts from `SinglePlayerGameArea`. The user wants consistency: left panel (Hold + stats), center (board), right panel (Next pieces).

### Problem 3: Unnecessary replays being saved
Training modes (`tspin_training_*`, `speed_training_*`) and games with 0 lines/0 score are being saved. Single-player casual modes shouldn't be recorded.

## Implementation Steps

### Step 1: Fix RLS - Add PERMISSIVE leaderboard policy
Create a migration to add a PERMISSIVE SELECT policy allowing authenticated users to view all replays in the `compressed_replays` table (needed for global leaderboard). The existing restrictive policies will still apply as additional constraints, so we need to convert the user-own policy to PERMISSIVE and add a new public leaderboard read policy.

```sql
-- Drop existing restrictive SELECT policies
DROP POLICY IF EXISTS "Users can view their own replays" ON compressed_replays;
DROP POLICY IF EXISTS "Authenticated users can view featured replays" ON compressed_replays;

-- Recreate as PERMISSIVE (default)
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
```

### Step 2: Add `key` prop to replay players
In `ReplaySystem.tsx` and `LeaderboardView.tsx`, add `key={playerReplayData?.id || 'replay'}` to force React to remount the player when a different replay is selected.

### Step 3: Unify replay player to use `ReplayPlayerV4Unified`
Remove `SimpleReplayPlayer` usage from `ReplaySystem.tsx` and use `ReplayPlayerV4Unified` instead (which already implements state-snapshot playback).

### Step 4: Redesign `ReplayPlayerV4Unified` layout to match `SinglePlayerGameArea`
Restructure the replay player layout to mirror the main game:
- Left panel: Hold piece display + stats (Score, Lines, Level, PPS, APM, Time)
- Center: Game board (same size/styling as main game)
- Right panel: Next piece preview (5 pieces)
- Bottom: Floating playback controls bar (similar to `SimpleReplayPlayer`'s design)
- Remove the card-based layout and use full-screen with wallpaper background

### Step 5: Fix save conditions - exclude training and zero-score games
Update `replaySaveConditions.ts`:
- Skip training modes (`*_training_*`)
- Skip games with 0 lines AND 0 score
- Skip endless/casual single-player modes (already handled, but enforce)

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Fix RLS policies - make SELECT permissive for leaderboard access |
| `src/components/ReplayPlayerV4Unified.tsx` | Redesign layout to match SinglePlayerGameArea |
| `src/components/ReplaySystem.tsx` | Use ReplayPlayerV4Unified instead of SimpleReplayPlayer; add key prop |
| `src/components/LeaderboardView.tsx` | Add key prop to replay player |
| `src/utils/replaySaveConditions.ts` | Exclude training modes and zero-score games |

