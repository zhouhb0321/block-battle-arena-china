

# Fix AI Battle: Keyboard Lag, Weak AI, Layout

## Issues

### 1. Keyboard Stickiness / Lag
The `gameSettings` object is recreated every render (new object reference each time), which causes `processHeldKeys` to get a new reference, restarting the `requestAnimationFrame` loop on every state update. Additionally, the AI running two full game logic instances (gravity, piece generation, board evaluation) every frame creates heavy CPU load.

**Fix**: Memoize `gameSettings` with `useMemo`. Also remove excessive `console.log` calls in `useKeyboardControls` that fire on every keypress and every ARR tick -- these are expensive during fast gameplay.

### 2. AI Far Too Weak
The heuristic weights are poorly calibrated. With `lines: 150` and `holes: -60` at medium difficulty, the AI needs to clear 1 line just to offset creating 2.5 holes. The height penalty (`-5` per unit across ~10 columns = `-50` aggregate) also discourages stacking high enough to complete lines. The well bonus (`10`) is negligible.

**Fix**: Dramatically increase line-clear rewards (especially for Tetris), increase hole/bumpiness penalties to force cleaner stacking, and add a specific bonus for keeping the board low overall. New weights:

| Difficulty | lines | height | holes | bumpiness | well | Tetris bonus |
|------------|-------|--------|-------|-----------|------|-------------|
| Easy       | 200   | -3     | -50   | -8        | 8    | x1.5        |
| Medium     | 500   | -8     | -120  | -18       | 15   | x2          |
| Hard       | 800   | -12    | -200  | -25       | 25   | x3          |
| Expert     | 1200  | -15    | -300  | -35       | 35   | x4          |

Also reduce noise and speed up action steps so the AI actually places pieces before gravity locks them.

### 3. Layout: HOLD/NEXT Swapped for Right Player
The code at line 134 of `TetrioBattleLayout.tsx` swaps HOLD and NEXT panels for the right-side player (`isLeft=false`). User wants HOLD always on the left of the board and NEXT always on the right for both players.

**Fix**: Remove the conditional swap -- always render `<HoldPanel />` left of the board and `<NextPanel />` right of the board regardless of `isLeft`.

---

## Changes

### File: `src/components/game/AIBattleGame.tsx`
- Wrap `gameSettings` in `useMemo` to prevent reference changes on every render
- This stabilizes `processHeldKeys` → stabilizes the rAF loop

### File: `src/hooks/useKeyboardControls.ts`
- Remove all `console.log` statements (there are ~12 of them firing on every keypress and ARR tick, causing significant performance overhead during fast play)

### File: `src/utils/aiEngine.ts`
- Rebalance all difficulty weights with much higher line-clear rewards
- Increase Tetris bonus multiplier per difficulty level
- Speed up action steps: Easy 100ms, Medium 60ms, Hard 40ms, Expert 25ms
- Reduce think times: Easy 400ms, Medium 200ms, Hard 100ms, Expert 30ms

### File: `src/components/game/TetrioBattleLayout.tsx`
- Lines 134 and 147: Change to always render `<HoldPanel />` on left and `<NextPanel />` on right (remove `isLeft` conditional)

