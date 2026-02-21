

# Fix: Replay Board Spawn Area + Auto-Replay on Reset

## Problem 1: Missing Spawn Area

The replay player renders only 20 rows by slicing the board (`displayBoard.slice(hiddenRows, hiddenRows + visibleRows)`), cutting off the top 3 hidden rows where pieces spawn. The main game uses `EnhancedGameBoard` which renders all 23 rows with the top 3 semi-transparent, so pieces visually emerge from the spawn area.

**Fix**: Replace the custom board rendering in `ReplayPlayerV4Unified` with the shared `EnhancedGameBoard` component -- the same one used in `SinglePlayerGameArea`. This ensures:
- The spawn area (rows 0-2) is visible as semi-transparent
- Pieces appear naturally from the top
- Block skins, ghost pieces, and animations are consistent

## Problem 2: Replay End Behavior

Currently, when a replay finishes, the timeline stays at the end. The reset button sets time to 0 but does NOT auto-play. User expects: click reset/replay -> auto-start playback from the beginning.

**Fix**: Modify `handleReset` to also set `isPlaying = true`, so clicking reset immediately begins playback from the start.

## Technical Details

### File: `src/components/ReplayPlayerV4Unified.tsx`

1. **Import `EnhancedGameBoard`** instead of rendering cells manually
2. **Replace the board grid** (lines 366-398) with:
   ```tsx
   <EnhancedGameBoard
     board={displayBoard}
     ghostPiece={null}   // ghost already baked into displayBoard
     cellSize={24}
     showGrid={true}
     showHiddenRows={true}
   />
   ```
3. **Remove `getCellStyle` function** (lines 273-309) -- no longer needed since `EnhancedGameBoard` handles all cell styling
4. **Update `handleReset`** (lines 131-135):
   ```typescript
   const handleReset = useCallback(() => {
     setCurrentTime(0);
     setIsPlaying(true);  // Auto-play on reset
     lastFrameTimeRef.current = null;
   }, []);
   ```

### Files Modified

| File | Change |
|------|--------|
| `src/components/ReplayPlayerV4Unified.tsx` | Use `EnhancedGameBoard` for board rendering; auto-play on reset |

