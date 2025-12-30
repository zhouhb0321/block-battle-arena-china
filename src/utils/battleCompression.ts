/**
 * WebSocket 消息压缩和增量更新工具
 * 减少网络传输数据量，提高同步效率
 */

// 棋盘状态增量编码
export interface BoardDiff {
  changedRows: Array<{ row: number; data: number[] }>;
  fullBoard?: never;
}

export interface BoardFull {
  changedRows?: never;
  fullBoard: number[][];
}

export type CompressedBoard = BoardDiff | BoardFull;

/**
 * 比较两个棋盘，生成增量更新
 */
export function createBoardDiff(
  oldBoard: number[][] | null,
  newBoard: number[][]
): CompressedBoard {
  // 如果没有旧棋盘，发送完整数据
  if (!oldBoard) {
    return { fullBoard: newBoard };
  }

  const changedRows: Array<{ row: number; data: number[] }> = [];

  for (let row = 0; row < newBoard.length; row++) {
    const oldRow = oldBoard[row];
    const newRow = newBoard[row];

    // 检查行是否有变化
    if (!oldRow || !arraysEqual(oldRow, newRow)) {
      changedRows.push({ row, data: newRow });
    }
  }

  // 如果超过60%的行变化了，发送完整棋盘更高效
  if (changedRows.length > newBoard.length * 0.6) {
    return { fullBoard: newBoard };
  }

  return { changedRows };
}

/**
 * 应用棋盘增量更新
 */
export function applyBoardDiff(
  currentBoard: number[][],
  diff: CompressedBoard
): number[][] {
  if (diff.fullBoard) {
    return diff.fullBoard;
  }

  // 复制当前棋盘
  const newBoard = currentBoard.map(row => [...row]);

  // 应用增量更新
  for (const change of diff.changedRows) {
    if (change.row >= 0 && change.row < newBoard.length) {
      newBoard[change.row] = change.data;
    }
  }

  return newBoard;
}

/**
 * 压缩游戏状态
 * 只发送必要字段，减少数据量
 */
export interface CompressedGameState {
  // 核心状态 (必需)
  s: number;   // score
  l: number;   // lines
  lv: number;  // level
  a: boolean;  // alive
  
  // 性能统计 (可选，每秒更新一次)
  p?: number;  // pps
  m?: number;  // apm
  
  // 连击状态 (变化时发送)
  c?: number;  // combo
  b?: number;  // b2b
  
  // 攻击信息 (有攻击时发送)
  atk?: number; // totalAttack
  g?: number;   // garbageQueued
  
  // 棋盘 (增量更新)
  bd?: CompressedBoard;
}

export interface FullGameState {
  board: number[][];
  score: number;
  lines: number;
  level: number;
  apm: number;
  pps: number;
  combo: number;
  b2b: number;
  totalAttack: number;
  alive: boolean;
  garbageQueued: number;
}

/**
 * 压缩游戏状态为紧凑格式
 */
export function compressGameState(
  state: FullGameState,
  previousState: FullGameState | null,
  includeStats: boolean = false
): CompressedGameState {
  const compressed: CompressedGameState = {
    s: state.score,
    l: state.lines,
    lv: state.level,
    a: state.alive
  };

  // 性能统计 (每秒更新一次)
  if (includeStats) {
    compressed.p = Math.round(state.pps * 100) / 100;
    compressed.m = Math.round(state.apm * 10) / 10;
  }

  // 连击状态 (只在变化时发送)
  if (!previousState || state.combo !== previousState.combo) {
    compressed.c = state.combo;
  }
  if (!previousState || state.b2b !== previousState.b2b) {
    compressed.b = state.b2b;
  }

  // 攻击信息
  if (state.totalAttack > 0 && (!previousState || state.totalAttack !== previousState.totalAttack)) {
    compressed.atk = state.totalAttack;
  }
  if (state.garbageQueued > 0) {
    compressed.g = state.garbageQueued;
  }

  // 棋盘增量
  compressed.bd = createBoardDiff(previousState?.board || null, state.board);

  return compressed;
}

/**
 * 解压游戏状态
 */
export function decompressGameState(
  compressed: CompressedGameState,
  previousState: FullGameState | null
): FullGameState {
  const base = previousState || {
    board: Array(20).fill(null).map(() => Array(10).fill(0)),
    score: 0,
    lines: 0,
    level: 1,
    apm: 0,
    pps: 0,
    combo: 0,
    b2b: 0,
    totalAttack: 0,
    alive: true,
    garbageQueued: 0
  };

  return {
    board: compressed.bd ? applyBoardDiff(base.board, compressed.bd) : base.board,
    score: compressed.s,
    lines: compressed.l,
    level: compressed.lv,
    apm: compressed.m ?? base.apm,
    pps: compressed.p ?? base.pps,
    combo: compressed.c ?? base.combo,
    b2b: compressed.b ?? base.b2b,
    totalAttack: compressed.atk ?? base.totalAttack,
    alive: compressed.a,
    garbageQueued: compressed.g ?? 0
  };
}

// 辅助函数
function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * 计算压缩率
 */
export function calculateCompressionRatio(
  original: FullGameState,
  compressed: CompressedGameState
): number {
  const originalSize = JSON.stringify(original).length;
  const compressedSize = JSON.stringify(compressed).length;
  return (1 - compressedSize / originalSize) * 100;
}
