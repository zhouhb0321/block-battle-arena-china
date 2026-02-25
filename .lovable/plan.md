

# Battle Room & Ranked Match Flow -- Issues and Fixes

## Issues Found

### 1. Ranked Match: Hardcoded Mock Data Instead of Real Stats
`RankedMatchmakingSystem.tsx` displays hardcoded stats (127 games, 68% win rate, 2.3 PPS, 89.5 APM) and mock recent matches. Queue stats (31 in queue, 452 in game) are also fake constants. This misleads players about the system's status.

**Fix**: Replace with real data from `battle_history` table, or clearly label as "Demo" / "Coming Soon" until real matchmaking is live.

### 2. Ranked Match: Simulated Matchmaking with setTimeout
`handleStartSearch` uses a 5-second `setTimeout` to fake finding an opponent (line 266-283). The opponent is created with random rating. This creates a broken experience -- after the countdown, `gameStarted` becomes true but there's no real opponent sending state updates, so the opponent board stays empty.

**Fix**: Show a clear "Demo Mode" indicator, or disable the start button with a "Coming Soon" message until real WebSocket matchmaking is implemented.

### 3. Battle Room Lobby: Auto-Start When All Ready Has Race Condition
In `BattleRoomLobby.tsx` (lines 137-160), the effect watches `participants` and auto-starts a 3-second countdown when all players have `score === 1`. However:
- The `onStartGame` dependency in useEffect is missing a stable reference (it's a prop passed from Index.tsx as `() => setCurrentView('battle-game')`)
- If any player un-readies during countdown, the countdown continues because no cancellation logic exists

**Fix**: Add countdown cancellation when any player un-readies. Wrap `onStartGame` with `useCallback` or use a ref.

### 4. Battle Game View: No Actual Game Board Rendering
`BattleGameView.tsx` renders `TetrioBattleLayout` for display but has NO keyboard controls or game logic running locally. It only receives opponent state via WebSocket. The player's game board is an empty initial state that never updates from user input.

**Fix**: Integrate `useGameLogic` and `useKeyboardControls` (like `RankedMatchmakingSystem` does) so the player can actually play during battle.

### 5. Room Leave Doesn't Close Room When Creator Leaves
In `BattleRoomLobby.tsx` `handleLeave` (line 264-283), when the room creator leaves, the room stays as "waiting" with reduced player count. Other players remain in a room with no host. The room should either transfer ownership or close.

**Fix**: If the leaving player is the room creator, either assign a new creator or mark the room as "finished".

### 6. UI Language Inconsistency
Most battle/ranked UI text is hardcoded in Chinese ("准备开始排位赛", "游戏即将开始", "成功加入房间", etc.) instead of using the `t()` translation function. The project targets global players (EN, ES, ZH, JP, KR).

**Fix**: Replace all hardcoded Chinese strings with `t()` calls and add corresponding translation keys.

### 7. Opponent Board Uses 20 Rows, Player Board Uses 23
In `RankedMatchmakingSystem.tsx` line 61, `opponentState.board` is initialized as `Array(20)` while `playerState` uses 23 rows. This causes display inconsistency when using the same board component.

**Fix**: Initialize opponent board with 23 rows to match the standard board height.

---

## Implementation Plan

### Phase 1: Critical Gameplay Fixes (must-have)

| File | Change |
|------|--------|
| `BattleGameView.tsx` | Add `useGameLogic` + `useKeyboardControls` so the player can actually play during battles |
| `BattleRoomLobby.tsx` | Add countdown cancellation when a player un-readies; handle room creator leaving |
| `RankedMatchmakingSystem.tsx` | Fix opponent board to 23 rows; add "Demo" label to simulated matchmaking |

### Phase 2: UX Polish

| File | Change |
|------|--------|
| `RankedMatchmakingSystem.tsx` | Replace hardcoded stats with real data or clear placeholder labels |
| `BattleRoomLobby.tsx`, `BattleGameView.tsx`, `RankedMatchmakingSystem.tsx` | Internationalize all hardcoded Chinese strings with `t()` |

### Phase 3: Robustness

| File | Change |
|------|--------|
| `BattleRoomLobby.tsx` | Transfer room ownership or close room when creator leaves |
| `RankedMatchmakingSystem.tsx` | Add proper error handling when WebSocket connection fails during matchmaking |

