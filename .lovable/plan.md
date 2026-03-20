

# Database Keep-Alive, Graphics & Controls Optimization

## Part 1: Supabase Database Keep-Alive Script

Supabase pauses free-tier databases after 7 days of inactivity. We'll create a scheduled edge function that runs every 2 days to keep the database active.

**Approach**: Use `pg_cron` + `pg_net` to schedule an HTTP call to an edge function that writes a heartbeat record.

### Steps:
1. Create `keep-alive` edge function that inserts a timestamp into `security_events` table (reusing existing table)
2. Set up a `pg_cron` job to call this function every 2 days
3. The function logs a `database_keepalive` event with timestamp

---

## Part 2: Controls Feel Optimization

### Problem Analysis
The `GameKeyboardHandler.tsx` has **12+ `console.log` calls** firing on every keypress (left, right, rotate, etc.) and every ARR tick. These are synchronous blocking operations during the critical input path, causing perceivable lag especially during fast play.

Additionally, the `handleKeyDown` callback in `useKeyboardControls` has **17 dependencies** in its `useCallback` array (line 117), meaning it recreates on almost every state change, which triggers `removeEventListener` + `addEventListener` cycles — brief windows where key events are dropped.

### Fixes

**File: `src/components/game/GameKeyboardHandler.tsx`**
- Remove all `console.log` calls from keyboard action callbacks (lines 38-42, 51-54, 82-86, 89, 151, 159)
- These fire on every single keypress and ARR repeat — extremely expensive during fast gameplay

**File: `src/hooks/useKeyboardControls.ts`**
- Stabilize `handleKeyDown` by using refs for action callbacks instead of including them in the dependency array
- Create `actionsRef` that holds all callbacks, updated via `useEffect`
- `handleKeyDown` and `processHeldKeys` only depend on `gameSettings` ref and `keys` — no more 17-dependency arrays
- This eliminates event listener re-binding during gameplay

**File: `src/hooks/useGameLogic.ts`** (gravity loop improvement)
- Line 962: The gravity system uses `setTimeout` which is imprecise (can drift 4-16ms). Replace with accumulator-based gravity in the existing `requestAnimationFrame` loop (line 972-1060)
- Merge gravity into the rAF tick: accumulate elapsed time, drop when threshold exceeded
- This gives smoother, more consistent piece movement at all speeds
- Remove redundant console.logs throughout

---

## Part 3: Graphics Polish

### Problem Analysis
The `EnhancedGameBoard` has `transition: all 0.1s ease` on every cell (line 265). With 230 cells (23x10), this creates 230 CSS transition calculations on every state change. For a 60fps game, this causes visible stuttering.

The ghost piece rendering uses dashed borders and animation (`ghost-pulse` 2s infinite) which is computationally expensive.

### Fixes

**File: `src/components/EnhancedGameBoard.tsx`**
- Remove `transition: all 0.1s ease` from `.game-cell` — blocks should snap instantly to position, not animate
- Keep transition only on `.clearing-line` for the line clear effect
- Optimize ghost piece: use a simpler semi-transparent fill instead of dashed border + animation
- Remove `image-rendering: pixelated` (lines 258-261) which causes blurry edges on non-pixel-art blocks
- Add `will-change: opacity` only to clearing lines for GPU acceleration
- Use `React.memo` with custom comparator on individual cells to prevent unnecessary re-renders (the board currently re-renders all 230 cells when any single cell changes)

**File: `src/components/EnhancedGameBoard.tsx`** (visual improvements)
- Improve block rendering: add subtle inner highlight for 3D depth effect
- Enhance grid lines: use consistent thin borders that don't shift block positions
- Lock delay flash: use `box-shadow` instead of `filter: brightness()` (filter triggers full repaint)

---

## Summary of Changes

| File | Changes |
|------|---------|
| `supabase/functions/keep-alive/index.ts` | New: heartbeat endpoint |
| Database (pg_cron) | Schedule keep-alive every 2 days |
| `src/components/game/GameKeyboardHandler.tsx` | Remove all console.log from input handlers |
| `src/hooks/useKeyboardControls.ts` | Stabilize callbacks with refs pattern; eliminate dependency array churn |
| `src/hooks/useGameLogic.ts` | Merge gravity into rAF loop; remove setTimeout-based gravity |
| `src/components/EnhancedGameBoard.tsx` | Remove per-cell transitions; optimize ghost rendering; improve visual polish |

