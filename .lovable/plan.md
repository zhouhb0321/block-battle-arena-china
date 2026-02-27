

# Fix AI Battle Practice Mode

## Problems Identified

1. **Player controls don't work**: `AIBattleGame` creates `useGameLogic` but never hooks up `useKeyboardControls`. There's no keyboard handler, so pressing keys does nothing.

2. **User key bindings ignored**: `AIBattleGame` uses hardcoded `defaultSettings` instead of the user's saved settings from `useUserSettings()`. Custom DAS/ARR/SDF and key mappings are all lost.

3. **Layout mirror issue**: In `TetrioBattleLayout`, the right-side player (AI) uses `flex-row-reverse` which flips the panel order, but `LeftPanel` always renders HOLD and `RightPanel` always renders NEXT. For the mirrored (right) player, NEXT should be on the left side and HOLD on the right -- this requires swapping the panel contents, not just the flex direction.

4. **AI bot is non-functional**: The AI only picks a target column based on column height, moves left/right to reach it, then hard drops. It never considers piece rotation, doesn't evaluate placement quality after rotation, and has no concept of line clears, T-spins, or combos. It plays almost randomly.

---

## Plan

### 1. Wire up player keyboard controls using user settings

**File: `src/components/game/AIBattleGame.tsx`**

- Replace hardcoded `defaultSettings` with `useUserSettings()` to load the user's saved key bindings and handling parameters (DAS/ARR/SDF/DCD).
- Add `useKeyboardControls` hook connected to `playerGameLogic` so keyboard input actually moves pieces.
- Add a `requestAnimationFrame` loop to call `processHeldKeys` for DAS/ARR auto-repeat (same pattern as `GameKeyboardHandler`).

### 2. Fix TetrioBattleLayout mirroring

**File: `src/components/game/TetrioBattleLayout.tsx`**

- Modify `PlayerSide` so that when `isLeft=false` (right-side player), the panel contents swap: the left panel shows NEXT and the right panel shows HOLD + stats. Currently `flex-row-reverse` only reverses the container order but doesn't swap which panel contains HOLD vs NEXT.

### 3. Rebuild AI with proper placement evaluation

**File: `src/components/game/AIBattleGame.tsx`**

Replace the naive "find best column" AI with a proper placement evaluator that:
- Simulates all possible placements: for each rotation (0-3), for each valid column position, simulate dropping the piece
- Evaluates each placement using weighted heuristics:
  - **Aggregate height** (lower is better)
  - **Complete lines** (more is better)
  - **Holes created** (fewer is better)
  - **Bumpiness / height variance** (smoother is better)
- Difficulty levels adjust:
  - **Easy**: Adds random noise to scores, slow move speed (800ms), occasionally makes suboptimal choices
  - **Medium**: Moderate noise, 500ms speed
  - **Hard**: Minimal noise, 300ms speed, better weights
  - **Expert**: No noise, 150ms speed, optimal weights, considers T-spins
- The AI executes moves step-by-step (rotate, move left/right, then hard drop) rather than teleporting

### 4. Internationalize hardcoded Chinese strings

Replace Chinese text in `AIBattleGame` ("AI对战练习", "难度:", "简单", "返回", "开始游戏", "结束游戏") with `t()` translation calls.

---

## Technical Details

### Keyboard integration (AIBattleGame.tsx)

```text
useUserSettings() --> gameSettings (user's real settings)
                  |
useKeyboardControls({
  gameSettings,
  onMoveLeft: playerGameLogic.movePiece(-1,0),
  onHardDrop: playerGameLogic.hardDrop(),
  ...
})
                  |
requestAnimationFrame loop --> processHeldKeys(timestamp)
```

### AI placement algorithm

```text
For each rotation r in [0,1,2,3]:
  For each column x in [0..9]:
    1. Create rotated piece shape
    2. Check if position is valid
    3. Simulate drop to landing row
    4. Place piece on board copy
    5. Count cleared lines
    6. Score = w1*linesCleared - w2*aggregateHeight - w3*holes - w4*bumpiness
    7. Add random noise based on difficulty
  
Best move = {rotation, targetX} with highest score
Execute: rotate to target rotation, move to target X, then hard drop
```

### Layout fix (TetrioBattleLayout.tsx)

For `isLeft=true` (player): `[HOLD+Stats] [Board] [NEXT]`
For `isLeft=false` (AI): `[NEXT] [Board] [HOLD+Stats]` -- swap LeftPanel/RightPanel contents based on `isLeft` prop.

### Files Modified

| File | Changes |
|------|---------|
| `src/components/game/AIBattleGame.tsx` | Add useUserSettings, useKeyboardControls, rAF loop, rebuild AI logic, i18n |
| `src/components/game/TetrioBattleLayout.tsx` | Fix panel content swap for mirrored right-side player |

