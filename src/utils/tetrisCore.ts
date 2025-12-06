
import type { GamePiece } from './gameTypes';
import { TETROMINO_TYPE_IDS, getPieceShape } from './pieceGeneration';

// Board constants
export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 23;

// Create empty board
export const createEmptyBoard = (): number[][] => {
  return Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
};

// ✅ 获取方块旋转后的形状（核心修复）
export const getRotatedShape = (piece: GamePiece): number[][] => {
  if (!piece || !piece.type) {
    console.error('[tetrisCore] getRotatedShape: Invalid piece');
    return [[1]];
  }
  
  const rotation = piece.rotation || 0;
  const pieceType = piece.type.type || piece.type.name;
  
  // 使用 pieceGeneration 中的 getPieceShape 获取旋转后的形状
  return getPieceShape(pieceType, rotation);
};

// 检查给定的方块位置是否有效
export const isValidPosition = (board: number[][], piece: GamePiece): boolean => {
  // Defensive check: ensure piece is defined and has valid structure
  if (!piece || !piece.type || !piece.type.shape) {
    console.error('[tetrisCore] isValidPosition: piece structure is undefined or invalid', piece);
    return false;
  }
  
  const { x, y } = piece;
  // ✅ 使用旋转后的形状
  const shape = getRotatedShape(piece);
  
  // Additional check: ensure shape is a valid array
  if (!Array.isArray(shape) || shape.length === 0) {
    console.error('[tetrisCore] isValidPosition: shape is not a valid array', shape);
    return false;
  }

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] !== 0) {
        let boardX = x + col;
        let boardY = y + row;

        // 允许在顶部区域旋转(允许负Y),但仍检查水平边界和下方边界
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

// 将方块放置在游戏面板上 - ✅ 修复为使用旋转后的形状
export const placePiece = (board: number[][], piece: GamePiece): number[][] => {
  // ✅ 防御性检查
  if (!board || !Array.isArray(board)) {
    console.error('[placePiece] Invalid board');
    return createEmptyBoard();
  }
  
  if (!piece || !piece.type) {
    console.error('[placePiece] Invalid piece');
    return board;
  }
  
  const { type, x, y } = piece;
  // ✅ 核心修复：使用旋转后的形状而不是默认形状
  const shape = getRotatedShape(piece);
  const typeId = TETROMINO_TYPE_IDS[type.type || type.name]; // 使用方块类型编号

  // ✅ 安全复制棋盘
  const newBoard = board.map((row, idx) => {
    if (!row || !Array.isArray(row)) {
      console.warn(`[placePiece] Row ${idx} invalid, creating empty row`);
      return Array(BOARD_WIDTH).fill(0);
    }
    return [...row];
  });

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] !== 0) {
        let boardX = x + col;
        let boardY = y + row;

        // 允许在隐藏区域放置,但检查边界(防止负索引写入)
        if (boardX >= 0 && boardX < BOARD_WIDTH && boardY >= 0 && boardY < BOARD_HEIGHT) {
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
  
  // 逐行向下检查,直到找到无法放置的位置
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
