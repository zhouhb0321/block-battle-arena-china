
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
  const { type, x, y } = piece;
  const shape = type.shape;

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] !== 0) {
        let boardX = x + col;
        let boardY = y + row;

        if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT || boardY < 0 || board[boardY][boardX] !== 0) {
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

// 修复计算方块的掉落位置 - 确保返回正确的最终位置，添加详细验证
export const calculateDropPosition = (board: number[][], piece: GamePiece): number => {
  if (!piece || !board || board.length === 0) {
    console.error('calculateDropPosition: Invalid input', { piece, boardLength: board?.length });
    return piece?.y || 0;
  }

  let dropY = piece.y;
  
  // 确保起始位置是有效的
  if (!isValidPosition(board, piece)) {
    console.warn('calculateDropPosition: Starting position is invalid', { 
      piece: piece.type.type, 
      position: { x: piece.x, y: piece.y } 
    });
    return piece.y;
  }
  
  // 逐行向下检查，直到找到无法放置的位置
  while (dropY < BOARD_HEIGHT - 1) {
    const testPiece = { ...piece, y: dropY + 1 };
    if (!isValidPosition(board, testPiece)) {
      break;
    }
    dropY++;
  }
  
  // 验证计算结果
  const finalPiece = { ...piece, y: dropY };
  if (!isValidPosition(board, finalPiece)) {
    console.error('calculateDropPosition: Final position is invalid', {
      piece: piece.type.type,
      originalY: piece.y,
      calculatedY: dropY,
      finalPosition: { x: finalPiece.x, y: finalPiece.y }
    });
    return piece.y; // 返回原始位置以避免错误
  }
  
  console.log('calculateDropPosition: Success', {
    piece: piece.type.type,
    from: piece.y,
    to: dropY,
    distance: dropY - piece.y
  });
  
  return dropY;
};

// 创建幽灵方块
export const createGhostPiece = (board: number[][], piece: GamePiece): GamePiece => {
  let dropY = calculateDropPosition(board, piece);
  return { ...piece, y: dropY };
};
