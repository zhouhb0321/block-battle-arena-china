/**
 * AI Placement Engine for Bot Battle Practice
 * Evaluates all possible placements using weighted heuristics.
 */

import { TETROMINO_SHAPES } from './tetrominoShapes';
import { BOARD_WIDTH, BOARD_HEIGHT } from './tetrisCore';

export interface AIMove {
  targetRotation: number;
  targetX: number;
  score: number;
}

interface DifficultyConfig {
  weights: { lines: number; height: number; holes: number; bumpiness: number };
  noise: number;       // random noise amplitude
  moveInterval: number; // ms between AI actions
  mistakeRate: number;  // probability of picking a random move instead
}

const DIFFICULTY_CONFIGS: Record<string, DifficultyConfig> = {
  easy:   { weights: { lines: 50, height: -3, holes: -30, bumpiness: -5 },  noise: 40,  moveInterval: 800, mistakeRate: 0.15 },
  medium: { weights: { lines: 80, height: -5, holes: -50, bumpiness: -8 },  noise: 15,  moveInterval: 500, mistakeRate: 0.05 },
  hard:   { weights: { lines: 120, height: -7, holes: -80, bumpiness: -12 }, noise: 5,   moveInterval: 300, mistakeRate: 0.02 },
  expert: { weights: { lines: 200, height: -10, holes: -120, bumpiness: -18 }, noise: 0, moveInterval: 150, mistakeRate: 0 },
};

export function getAIMoveInterval(difficulty: string): number {
  return DIFFICULTY_CONFIGS[difficulty]?.moveInterval ?? 500;
}

/**
 * Get the shape matrix for a piece type at a given rotation.
 */
function getShape(pieceType: string, rotation: number): number[][] {
  const shape = TETROMINO_SHAPES[pieceType];
  if (!shape) return [[1]];
  return shape.rotations[((rotation % 4) + 4) % 4];
}

/**
 * Check if placing shape at (x, y) on board is valid.
 */
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

/**
 * Simulate dropping a piece from (x, y) downward until it lands.
 * Returns the final y, or -1 if the starting position is invalid.
 */
function simulateDrop(board: number[][], shape: number[][], x: number, startY: number): number {
  if (!isValid(board, shape, x, startY)) return -1;
  let y = startY;
  while (isValid(board, shape, x, y + 1)) y++;
  return y;
}

/**
 * Place shape on a board copy and return the new board + lines cleared.
 */
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
  
  // Count and remove full lines
  let linesCleared = 0;
  const filtered = newBoard.filter(row => {
    const full = row.every(cell => cell !== 0);
    if (full) linesCleared++;
    return !full;
  });
  
  // Add empty rows at top
  while (filtered.length < board.length) {
    filtered.unshift(new Array(cols).fill(0));
  }
  
  return { newBoard: filtered, linesCleared };
}

/**
 * Evaluate board quality (lower = worse for stacking).
 */
function evaluateBoard(board: number[][]): { aggregateHeight: number; holes: number; bumpiness: number } {
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
  
  return { aggregateHeight, holes, bumpiness };
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
  
  // Random mistake: return null so AI does a random action
  if (Math.random() < config.mistakeRate) {
    return null;
  }
  
  const cols = board[0]?.length ?? BOARD_WIDTH;
  let bestMove: AIMove | null = null;
  
  for (let rot = 0; rot < 4; rot++) {
    const shape = getShape(pieceType, rot);
    const shapeWidth = shape[0]?.length ?? 0;
    
    // Try all valid x positions
    for (let x = -2; x <= cols; x++) {
      const landY = simulateDrop(board, shape, x, 0);
      if (landY < 0) continue;
      
      const { newBoard, linesCleared } = placeAndClear(board, shape, x, landY);
      const { aggregateHeight, holes, bumpiness } = evaluateBoard(newBoard);
      
      let score = 
        config.weights.lines * linesCleared +
        config.weights.height * aggregateHeight +
        config.weights.holes * holes +
        config.weights.bumpiness * bumpiness;
      
      // Add noise
      if (config.noise > 0) {
        score += (Math.random() - 0.5) * 2 * config.noise;
      }
      
      if (!bestMove || score > bestMove.score) {
        bestMove = { targetRotation: rot, targetX: x, score };
      }
    }
  }
  
  return bestMove;
}
