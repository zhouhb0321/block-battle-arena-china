
import type { GamePiece } from './gameTypes';
import { TETROMINO_TYPE_IDS } from './pieceGeneration';

// Board constants
export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 23;

// Create empty board
export const createEmptyBoard = (): number[][] => {
  return Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
};

// 检查给定的方块位置是否有效
export const isValidPosition = (board: number[][], piece: GamePiece): boolean => {
  // Defensive check: ensure piece is defined
  if (!piece || !piece.type) {
    console.error('[tetrisCore] isValidPosition: piece is undefined or invalid', piece);
    return false;
  }
  
  const { type, x, y, rotation } = piece;
  const shape = type.shape;

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] !== 0) {
        let boardX = x + col;
        let boardY = y + row;

        // 允许在顶部区域旋转（允许负Y），但仍检查水平边界和下方边界
        if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
          return false;
        }
        
        // 只有在棋盘范围内才检查碰撞
        if (boardY >= 0 && board[boardY][boardX] !== 0) {
          return false;
        }
      }
    }
  }

  return true;
};

// 将方块放置在游戏面板上 - 修复为存储方块类型编号
export const placePiece = (board: number[][], piece: GamePiece): number[][] => {
  const { type, x, y } = piece;
  const shape = type.shape;
  const typeId = TETROMINO_TYPE_IDS[type.type]; // 使用方块类型编号而不是颜色

  const newBoard = board.map(row => [...row]);

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] !== 0) {
        let boardX = x + col;
        let boardY = y + row;

        // 允许在隐藏区域放置，但检查边界
        if (boardX >= 0 && boardX < BOARD_WIDTH && boardY < BOARD_HEIGHT) {
          newBoard[boardY][boardX] = typeId; // 存储方块类型编号
        }
      }
    }
  }

  return newBoard;
};

// 移除完整的行
export const clearLines = (board: number[][]): { newBoard: number[][]; linesCleared: number } => {
  let linesCleared = 0;
  const newBoard = board.filter(row => {
    if (row.every(cell => cell !== 0)) {
      linesCleared++;
      return false;
    }
    return true;
  });

  while (newBoard.length < BOARD_HEIGHT) {
    newBoard.unshift(Array(BOARD_WIDTH).fill(0));
  }

  return { newBoard, linesCleared };
};

// 修复计算方块的掉落位置 - 确保返回正确的最终位置
export const calculateDropPosition = (board: number[][], piece: GamePiece): number => {
  let dropY = piece.y;
  
  // 逐行向下检查，直到找到无法放置的位置
  while (dropY < BOARD_HEIGHT) {
    const testPiece = { ...piece, y: dropY + 1 };
    if (!isValidPosition(board, testPiece)) {
      break;
    }
    dropY++;
  }
  
  return dropY;
};

// 创建幽灵方块
export const createGhostPiece = (board: number[][], piece: GamePiece): GamePiece => {
  let dropY = calculateDropPosition(board, piece);
  return { ...piece, y: dropY };
};
