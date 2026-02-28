/**
 * AI Placement Engine for Bot Battle Practice
 * Evaluates all possible placements using weighted heuristics.
 * Supports two-phase timing (think + action) and hold evaluation.
 */

import { TETROMINO_SHAPES } from './tetrominoShapes';
import { BOARD_WIDTH, BOARD_HEIGHT } from './tetrisCore';

export interface AIMove {
  targetRotation: number;
  targetX: number;
  score: number;
  shouldHold: boolean;
}

interface DifficultyWeights {
  lines: number;
  height: number;
  holes: number;
  bumpiness: number;
  well: number;
}

interface DifficultyConfig {
  weights: DifficultyWeights;
  noise: number;
  thinkTime: number;   // ms delay before deciding
  actionStep: number;   // ms per rotate/move action
  mistakeRate: number;
}

const DIFFICULTY_CONFIGS: Record<string, DifficultyConfig> = {
  easy:   { weights: { lines: 80,  height: -2,  holes: -25,  bumpiness: -4,  well: 5  }, noise: 35, thinkTime: 600, actionStep: 120, mistakeRate: 0.12 },
  medium: { weights: { lines: 150, height: -5,  holes: -60,  bumpiness: -10, well: 10 }, noise: 12, thinkTime: 300, actionStep: 80,  mistakeRate: 0.05 },
  hard:   { weights: { lines: 250, height: -8,  holes: -100, bumpiness: -15, well: 15 }, noise: 3,  thinkTime: 150, actionStep: 50,  mistakeRate: 0.01 },
  expert: { weights: { lines: 400, height: -12, holes: -150, bumpiness: -20, well: 20 }, noise: 0,  thinkTime: 50,  actionStep: 30,  mistakeRate: 0 },
};

export function getAIThinkTime(difficulty: string): number {
  return DIFFICULTY_CONFIGS[difficulty]?.thinkTime ?? 300;
}

export function getAIActionStep(difficulty: string): number {
  return DIFFICULTY_CONFIGS[difficulty]?.actionStep ?? 80;
}

/** @deprecated Use getAIThinkTime + getAIActionStep instead */
export function getAIMoveInterval(difficulty: string): number {
  return DIFFICULTY_CONFIGS[difficulty]?.actionStep ?? 80;
}

function getShape(pieceType: string, rotation: number): number[][] {
  const shape = TETROMINO_SHAPES[pieceType];
  if (!shape) return [[1]];
  return shape.rotations[((rotation % 4) + 4) % 4];
}

function isValid(board: number[][], shape: number[][], x: number, y: number): boolean {
  const rows = board.length;
  const cols = board[0]?.length ?? BOARD_WIDTH;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] === 0) continue;
      const bx = x + c;
      const by = y + r;
      if (bx < 0 || bx >= cols || by < 0 || by >= rows) return false;
      if (board[by][bx] !== 0) return false;
    }
  }
  return true;
}

function simulateDrop(board: number[][], shape: number[][], x: number, startY: number): number {
  if (!isValid(board, shape, x, startY)) return -1;
  let y = startY;
  while (isValid(board, shape, x, y + 1)) y++;
  return y;
}

function placeAndClear(board: number[][], shape: number[][], x: number, y: number): { newBoard: number[][]; linesCleared: number } {
  const cols = board[0]?.length ?? BOARD_WIDTH;
  const newBoard = board.map(row => [...row]);

  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] !== 0) {
        const by = y + r;
        const bx = x + c;
        if (by >= 0 && by < newBoard.length && bx >= 0 && bx < cols) {
          newBoard[by][bx] = 1;
        }
      }
    }
  }

  let linesCleared = 0;
  const filtered = newBoard.filter(row => {
    const full = row.every(cell => cell !== 0);
    if (full) linesCleared++;
    return !full;
  });

  while (filtered.length < board.length) {
    filtered.unshift(new Array(cols).fill(0));
  }

  return { newBoard: filtered, linesCleared };
}

function evaluateBoard(board: number[][], weights: DifficultyWeights): { aggregateHeight: number; holes: number; bumpiness: number; wellBonus: number } {
  const cols = board[0]?.length ?? BOARD_WIDTH;
  const heights = new Array(cols).fill(0);

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < board.length; r++) {
      if (board[r][c] !== 0) {
        heights[c] = board.length - r;
        break;
      }
    }
  }

  const aggregateHeight = heights.reduce((sum, h) => sum + h, 0);

  let holes = 0;
  for (let c = 0; c < cols; c++) {
    let blockFound = false;
    for (let r = 0; r < board.length; r++) {
      if (board[r][c] !== 0) {
        blockFound = true;
      } else if (blockFound) {
        holes++;
      }
    }
  }

  let bumpiness = 0;
  for (let c = 0; c < cols - 1; c++) {
    bumpiness += Math.abs(heights[c] - heights[c + 1]);
  }

  // Well bonus: reward keeping the rightmost column as the lowest
  let wellBonus = 0;
  const rightHeight = heights[cols - 1];
  const otherMinHeight = Math.min(...heights.slice(0, cols - 1));
  if (rightHeight < otherMinHeight) {
    wellBonus = otherMinHeight - rightHeight;
  }

  return { aggregateHeight, holes, bumpiness, wellBonus };
}

function scorePlacement(
  board: number[][],
  pieceType: string,
  config: DifficultyConfig
): AIMove | null {
  const cols = board[0]?.length ?? BOARD_WIDTH;
  let bestMove: AIMove | null = null;

  for (let rot = 0; rot < 4; rot++) {
    const shape = getShape(pieceType, rot);
    for (let x = -2; x <= cols; x++) {
      const landY = simulateDrop(board, shape, x, 0);
      if (landY < 0) continue;

      const { newBoard, linesCleared } = placeAndClear(board, shape, x, landY);
      const { aggregateHeight, holes, bumpiness, wellBonus } = evaluateBoard(newBoard, config.weights);

      // Bonus for 4-line clear (Tetris)
      const lineBonus = linesCleared === 4 ? config.weights.lines * 2 : 0;

      let score =
        config.weights.lines * linesCleared +
        lineBonus +
        config.weights.height * aggregateHeight +
        config.weights.holes * holes +
        config.weights.bumpiness * bumpiness +
        config.weights.well * wellBonus;

      if (config.noise > 0) {
        score += (Math.random() - 0.5) * 2 * config.noise;
      }

      if (!bestMove || score > bestMove.score) {
        bestMove = { targetRotation: rot, targetX: x, score, shouldHold: false };
      }
    }
  }

  return bestMove;
}

/**
 * Find the best placement for a given piece type on the board.
 */
export function findBestPlacement(
  board: number[][],
  pieceType: string,
  difficulty: string
): AIMove | null {
  const config = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS.medium;

  if (Math.random() < config.mistakeRate) {
    return null;
  }

  return scorePlacement(board, pieceType, config);
}

/**
 * Evaluate both current piece and hold piece, return the better option.
 */
export function findBestPlacementWithHold(
  board: number[][],
  currentPieceType: string,
  holdPieceType: string | null,
  nextPieceType: string | null,
  difficulty: string
): AIMove | null {
  const config = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS.medium;

  if (Math.random() < config.mistakeRate) {
    return null;
  }

  const currentBest = scorePlacement(board, currentPieceType, config);

  // Determine what piece we'd get if we hold
  const altPieceType = holdPieceType || nextPieceType;
  if (!altPieceType || altPieceType === currentPieceType) {
    return currentBest;
  }

  const holdBest = scorePlacement(board, altPieceType, config);

  if (!currentBest && !holdBest) return null;
  if (!currentBest) return holdBest ? { ...holdBest, shouldHold: true } : null;
  if (!holdBest) return currentBest;

  if (holdBest.score > currentBest.score + 10) {
    return { ...holdBest, shouldHold: true };
  }

  return currentBest;
}
