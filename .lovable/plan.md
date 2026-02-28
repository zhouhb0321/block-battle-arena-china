

# Fix AI Battle: Controls Failing & AI Too Weak

## Problem Analysis

### 1. Controls Fail Late Game
The keyboard controls in `AIBattleGame` use inline arrow functions as callbacks (e.g., `() => playerGameLogic.movePiece(-1, 0)`). These create new references on every render, causing `handleKeyDown` in `useKeyboardControls` to recreate, which re-binds `keydown`/`keyup` event listeners constantly. During fast gameplay with many state updates, this creates brief windows where key events are dropped.

**Root cause**: The `handleKeyDown` callback dependency array includes all the action callbacks. When `playerGameLogic` state changes (score, lines, board, piece), the inline functions get new references, triggering full re-binding of keyboard listeners.

### 2. AI is Extremely Weak
Three compounding problems:
- **Speed**: `moveInterval` is per-action (rotate, move left/right, drop are separate). At medium difficulty (500ms/action), placing one piece takes 1.5-2.5 seconds -- far too slow.
- **Weights**: The heuristic weights undervalue line clearing and over-penalize height, causing the AI to stack flat but never clear lines effectively.
- **No hold usage**: The AI never uses the Hold function to save pieces for better placements.

---

## Implementation Plan

### Task 1: Stabilize player keyboard controls

**File: `src/components/game/AIBattleGame.tsx`**

Wrap all action callbacks in `useCallback` with stable references using refs for `playerGameLogic`:
- Create a `playerLogicRef = useRef(playerGameLogic)` that stays in sync
- All callbacks (onMoveLeft, onMoveRight, etc.) read from the ref instead of capturing the closure
- This prevents `handleKeyDown` from recreating on every game state change

### Task 2: Overhaul AI timing and intelligence

**File: `src/utils/aiEngine.ts`**

Restructure difficulty configs to separate "thinking time" (per-piece decision delay) from "action speed" (per-step move interval):

| Difficulty | Think Time | Action Step | Mistake Rate |
|------------|-----------|-------------|--------------|
| Easy       | 600ms     | 120ms       | 12%          |
| Medium     | 300ms     | 80ms        | 5%           |
| Hard       | 150ms     | 50ms        | 1%           |
| Expert     | 50ms      | 30ms        | 0%           |

Rebalance heuristic weights to produce competitive play:
- Increase line-clearing reward significantly (especially for 4-line clears)
- Add well-column bonus (keep one column open for Tetrises)
- Reduce height penalty to allow strategic stacking

**File: `src/components/game/AIBattleGame.tsx`**

Rewrite the AI loop to use a two-phase timing model:
1. **Think phase**: Wait `thinkTime` ms after a new piece spawns, then compute best placement
2. **Execute phase**: Rotate and move at `actionStep` ms intervals, then hard drop
3. This creates natural-looking play instead of one action per 500ms

### Task 3: Add AI Hold piece usage

**File: `src/utils/aiEngine.ts`**

Add a `findBestPlacementWithHold` function that:
- Evaluates the best placement for the current piece
- Also evaluates best placement for the hold piece (or next piece if hold is empty)
- Chooses whichever yields a better board state
- Returns a flag indicating whether to hold first

**File: `src/components/game/AIBattleGame.tsx`**

Add a `'holding'` phase to the AI state machine that calls `aiGameLogic.holdCurrentPiece()` before proceeding to rotate/move.

---

## Technical Details

### Stable callbacks pattern (AIBattleGame.tsx)

```text
const playerLogicRef = useRef(playerGameLogic);
useEffect(() => { playerLogicRef.current = playerGameLogic; });

// Callbacks never change reference:
const stableMoveLeft = useCallback(() => playerLogicRef.current.movePiece(-1, 0), []);
const stableMoveRight = useCallback(() => playerLogicRef.current.movePiece(1, 0), []);
// ... etc

// Pass stable callbacks to useKeyboardControls
```

### AI two-phase loop (AIBattleGame.tsx)

```text
State machine phases: thinking -> holding? -> rotating -> moving -> dropping -> thinking
                                                                              
thinking: wait thinkTime ms, compute best move
holding:  if hold is better, call holdCurrentPiece(), wait one actionStep
rotating: each actionStep ms, rotate once toward target rotation  
moving:   each actionStep ms, move one column toward target X
dropping: hard drop, reset to thinking
```

### Rebalanced weights (aiEngine.ts)

```text
easy:   { lines: 80,  height: -2,  holes: -25, bumpiness: -4,  well: 5  }
medium: { lines: 150, height: -5,  holes: -60, bumpiness: -10, well: 10 }
hard:   { lines: 250, height: -8,  holes: -100, bumpiness: -15, well: 15 }
expert: { lines: 400, height: -12, holes: -150, bumpiness: -20, well: 20 }
```

The "well" bonus rewards keeping one column (usually rightmost) empty for Tetris clears.

### Files Modified

| File | Changes |
|------|---------|
| `src/components/game/AIBattleGame.tsx` | Stabilize callbacks with refs; rewrite AI loop with two-phase timing; add hold support |
| `src/utils/aiEngine.ts` | Rebalance weights; add well bonus; separate think/action timing; add hold evaluation |

