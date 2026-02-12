

# Plan: Redesign Replay System - State-Snapshot Playback

## Problem Analysis

The current replay system has a **fundamental architectural flaw**: it tries to **re-simulate the game** by replaying INPUT events through the full game engine (gravity, lock delay, collision detection). This causes:

1. **Gravity desynchronization**: The replay engine runs its own gravity timer (`updateReplayTime`), which never matches the original timing exactly
2. **State drift**: Small timing differences accumulate across hundreds of pieces, causing pieces to land in wrong positions
3. **Board mismatch**: By the time keyframe correction kicks in (every 10 locks), the visual state has already diverged significantly
4. **Unnecessary complexity**: Running the entire game engine for playback introduces dozens of possible failure points

The screenshots show clear evidence: pieces are in wrong positions, the board layout doesn't match what was actually played.

## New Architecture: State-Snapshot Playback

Instead of re-simulating, the new system will simply **animate between recorded states**. The data is already there - LOCK events record final piece positions, FRAME events record per-frame positions, and KEYFRAMEs record full board snapshots.

```text
OLD (broken):
  Record INPUTs -> Replay: re-run game engine with INPUTs -> drift -> wrong board

NEW (correct):
  Record LOCK + FRAME + KF -> Replay: animate FRAME positions, apply LOCK boards directly
```

## Implementation Steps

### Step 1: Create New Lightweight Replay Player

**New file: `src/components/replay/StateReplayPlayer.tsx`**

A completely new replay player that does NOT use `useGameLogic`. Instead it:

- Reads LOCK events to get the sequence of board states (each LOCK has the board from its keyframe, or we reconstruct from piece placement)
- Reads FRAME events for smooth piece animation between locks
- Reads KEYFRAME events for full board state snapshots
- Uses a simple `requestAnimationFrame` loop to advance through time
- Renders the board, current piece, hold piece, and next pieces directly from recorded data
- Supports play/pause, speed control, seeking (via keyframes)

### Step 2: Build Board State Sequence from Recorded Data

**New file: `src/utils/replayV4/stateReconstructor.ts`**

Takes the V4 replay data and builds a timeline of complete game states:

```text
For each KEYFRAME: store full board snapshot
Between keyframes: reconstruct board by applying LOCK events
  - Start from last keyframe board
  - For each LOCK: place piece at (x, y, rotation) on the board, then clear lines
Result: array of { timestamp, board, currentPiece, nextPieces, holdPiece, score, lines, level }
```

This pre-processes the entire replay before playback starts, so seeking is instant.

### Step 3: Enhance Recording to Capture Complete Board at Every Lock

**Modify: `src/hooks/useReplayRecorderV4.ts`**

Currently, full board state is only recorded every 10 locks (keyframes). Update `recordLock` to always include the post-lock board state in the LOCK event itself. This makes reconstruction trivial and guarantees 100% fidelity.

Add a new field to `V4LockEvent`:
- `boardAfterLock: number[][]` - the board state AFTER this piece was placed and lines cleared

### Step 4: Update V4 Types

**Modify: `src/utils/replayV4/types.ts`**

- Add `boardAfterLock` field to `V4LockEvent`
- Add a new `V4GameState` interface for the reconstructed state timeline

### Step 5: Update ReplayPlayerV4Unified

**Modify: `src/components/ReplayPlayerV4Unified.tsx`**

Replace the current INPUT-driven playback with state-snapshot playback:
- Remove `useGameLogic` dependency entirely for replay
- Use the new `StateReplayPlayer` component or inline the logic
- Animate piece positions using FRAME events for smooth visuals
- Apply board states directly from the pre-computed timeline
- Keep all existing UI (controls, timeline, key moments, tabs)

### Step 6: Backward Compatibility

The new system will detect whether `boardAfterLock` exists in LOCK events:
- **New recordings**: Use `boardAfterLock` directly (100% fidelity)
- **Old recordings**: Fall back to keyframe + piece placement reconstruction (best effort)

## Files Changed

| File | Change |
|------|--------|
| `src/utils/replayV4/types.ts` | Add `boardAfterLock` to `V4LockEvent`, add `V4GameState` interface |
| `src/utils/replayV4/stateReconstructor.ts` | **NEW** - Pre-compute game state timeline from replay data |
| `src/hooks/useReplayRecorderV4.ts` | Include full board in every LOCK event |
| `src/components/ReplayPlayerV4Unified.tsx` | Replace game-engine playback with state-snapshot playback |
| `src/components/replay/StateReplayPlayer.tsx` | **NEW** - Lightweight state-driven replay renderer |

## Key Design Decisions

1. **No game engine in replay**: The replay player will NOT import or use `useGameLogic`. It simply renders pre-recorded states.
2. **Board stored per-lock**: ~200 bytes per lock event (20x10 board), for a typical 100-lock game that's ~20KB - negligible.
3. **FRAME events for animation**: Smooth piece movement between locks using the 60fps position samples already being recorded.
4. **Instant seeking**: Pre-computed state array allows O(1) jump to any point in the replay.

