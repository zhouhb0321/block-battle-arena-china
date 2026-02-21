

# Fix: Faithful Replay Playback (No Artificial Synthesis)

## Problem

The current `frameInterpolator.ts` synthesizes fake movement frames with artificial "thinking pauses" (50-200ms delays) and phased horizontal/vertical movement when real FRAME data is sparse. This contradicts the goal of faithful replay -- top players at 5 PPS lock pieces in ~200ms with no pause. The replay should show exactly what happened, nothing more, nothing less.

## Root Cause

The `synthesizeAllMissingFrames` and `synthesizeFramesBetween` functions in `frameInterpolator.ts` inject fabricated FRAME events that don't match reality. These fake frames add artificial delays and simulate movement patterns that never occurred.

## Solution

### 1. Remove all frame synthesis from `frameInterpolator.ts`

- Delete `synthesizeAllMissingFrames` and `synthesizeFramesBetween` functions entirely
- Remove the synthesis call in `prepareFrameLookup` -- only use real recorded FRAME events
- The binary search lookup and ghost piece calculation remain unchanged

### 2. Improve `getAnimatedPieceAtTime` for sparse data

When there are no FRAME events between a SPAWN and LOCK (e.g., very old recordings), instead of showing nothing, simply show the piece at spawn position until lock. This is a minimal, honest fallback -- no fake movement injected.

### 3. Remove artificial pause between LOCK and SPAWN

Currently, if the last event is LOCK and no SPAWN has happened yet, the piece is hidden (returning null). For fast players, this gap is real and should be respected. However, the current logic is already correct for this -- it shows no piece during the gap, which is the actual game behavior (the piece is locked and the next hasn't spawned yet).

## Files Changed

| File | Change |
|------|--------|
| `src/utils/replayV4/frameInterpolator.ts` | Remove `synthesizeAllMissingFrames`, `synthesizeFramesBetween`, and the synthesis call in `prepareFrameLookup`. Keep binary search, ghost piece, and SPAWN fallback logic. |

No other files need changes. The player component (`ReplayPlayerV4Unified.tsx`) already correctly uses the frame lookup API.

## Technical Details

The cleaned `prepareFrameLookup` will simply:
1. Extract FRAME, SPAWN, LOCK events from replay data
2. Sort each by timestamp
3. Return them directly -- no synthesis

The `getAnimatedPieceAtTime` logic stays the same:
- Between SPAWN and LOCK: show real FRAME data, fall back to spawn position if no frames exist
- Between LOCK and next SPAWN: show no piece (real gap)
- This faithfully reproduces the original gameplay timing

