

# Smooth Replay Playback - Natural Human-like Animation

## Problem

Currently, during replay playback, pieces "teleport" to their locked position. The experience is missing:

1. **Piece spawning at the top** and visibly falling/moving to the lock position
2. **Intermediate movement frames** showing left/right shifts and rotations
3. **Natural "thinking" pauses** between piece lock and the next piece's movement
4. **Ghost piece** showing where the piece will land (standard Tetris visual)

The root cause: although FRAME events are recorded at ~60fps during gameplay, the player's `animatedPiece` logic does a simple "find most recent frame" lookup. When there are gaps or the binary search for the state timeline returns a LOCK state, the piece appears to jump. Additionally, the piece disappears entirely between a LOCK and the next SPAWN because `currentState.currentPiece` is set from the next spawn, not from the frame data.

## Solution

### 1. Improved Piece Animation Pipeline (ReplayPlayerV4Unified.tsx)

Replace the simple "find nearest frame" logic with a proper interpolation system:

- **Binary search** through pre-sorted FRAME events for O(log n) lookup
- When `currentTime` falls between two FRAME events, show the earlier frame's position (no interpolation needed since frames are ~16ms apart, just need correct lookup)
- When no FRAME data exists for the current time window (between a LOCK and next SPAWN), show **no piece** briefly -- this naturally creates the "piece locked, pause, next piece appears" rhythm
- After SPAWN but before first FRAME, show piece at spawn position

### 2. Ghost Piece During Replay

Add ghost piece rendering during replay playback:
- Calculate the drop position for the current animated piece (same logic as live gameplay)
- Render it as a semi-transparent outline below the active piece
- This gives viewers a visual anchor for where the piece is heading

### 3. Synthesized "Thinking Time" for Sparse Frame Data

For older replays that may have sparse or missing FRAME events, synthesize natural-looking animation:
- After a LOCK event, insert a brief pause (~100-200ms) before showing the next piece moving
- When FRAME data is missing between SPAWN and LOCK, generate a simple linear interpolation from spawn position to lock position with appropriate timing
- This fallback ensures even old replays look natural

### 4. Smooth Piece Visibility Logic

```text
Timeline for each piece:

  SPAWN -----> FRAME FRAME FRAME ... FRAME -----> LOCK -----> (gap) -----> next SPAWN
  |            |                             |              |              |
  Show piece   Show piece at frame positions  Piece merges   Brief pause   Next piece
  at spawn pos with movement animation        into board     (natural)     appears
```

## Technical Details

### File: `src/components/ReplayPlayerV4Unified.tsx`

**Changes to `animatedPiece` (lines 82-105):**

- Use binary search instead of linear reverse scan
- Add proper boundary detection: if `currentTime` is past the last FRAME before a LOCK but before the LOCK timestamp, show piece at last known FRAME position
- If `currentTime` is between a LOCK and the next SPAWN, return `null` (creates natural pause)

**Add ghost piece calculation:**

```typescript
const ghostPiece = useMemo(() => {
  if (!animatedPiece) return null;
  const shape = getPieceShape(animatedPiece.type, animatedPiece.rotation);
  let ghostY = animatedPiece.y;
  // Drop until collision with board
  while (canPlace(currentState.board, shape, animatedPiece.x, ghostY + 1)) {
    ghostY++;
  }
  if (ghostY === animatedPiece.y) return null;
  return { ...animatedPiece, y: ghostY };
}, [animatedPiece, currentState.board]);
```

**Add ghost piece rendering in `displayBoard`:**

- Render ghost piece cells with a special marker value (e.g., negative typeId) so the cell renderer shows them as semi-transparent outlines

**Add fallback animation synthesis in `stateReconstructor.ts`:**

- New function `synthesizeFrames(spawnEvent, lockEvent)` that generates intermediate positions when FRAME data is missing
- Linear interpolation from spawn (x, y=0) to lock (x, y) over the time window, with a small initial delay to simulate "thinking"

### File: `src/utils/replayV4/stateReconstructor.ts`

Add a new export:

```typescript
export function synthesizeFramesBetween(
  spawn: V4SpawnEvent, 
  lock: V4LockEvent,
  existingFrames: V4FrameEvent[]
): V4FrameEvent[]
```

This generates synthetic FRAME events when the recording has fewer than 3 real frames between a spawn and lock. The synthetic frames:
- Start at spawn position after a small delay (simulating thinking)
- Move horizontally first (simulating DAS movement)
- Then drop vertically (simulating soft/hard drop)

### Files Modified

| File | Change |
|------|--------|
| `src/components/ReplayPlayerV4Unified.tsx` | Improved animatedPiece logic, ghost piece, smoother rendering |
| `src/utils/replayV4/stateReconstructor.ts` | Add synthesizeFramesBetween for fallback animation |

