

# Fix: Replay Page Crash + Verify Faithful Playback

## Bug Found

The replay page at `/replay/:id` crashes with **"events is not iterable"** because `ReplayPage.tsx` passes the raw loader result directly to `ReplayPlayerV4Unified`, but the component expects `V4ReplayData` (which has `.events`). The actual V4 data is nested at `replay.v4Data`.

Other components (`ReplaySystem`, `LeaderboardView`) correctly extract it via `getV4Data(data)` before passing it to the player. `ReplayPage` does not.

## Fix

### File: `src/pages/ReplayPage.tsx` (line 101-104)

Extract `v4Data` before passing to the player:

```typescript
// Before the return statement, add:
const v4Data = replay?.v4Data || replay;

// Then change:
<ReplayPlayerV4Unified
  replay={v4Data}       // was: replay
  onClose={handleBack}
  autoPlay={true}
/>
```

This is a one-line data extraction fix. No other files need changes.

## Verification

Once fixed, navigating to `/replay/:id` will load and play the replay correctly. The faithful playback logic (binary search through real FRAME/SPAWN/LOCK events, no artificial synthesis) is already implemented in `frameInterpolator.ts` -- it just couldn't run because of this crash.

