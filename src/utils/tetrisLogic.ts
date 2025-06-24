
import { TetrominoType, GamePiece, GameState } from '@/contexts/GameContext';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

export const rotatePiece = (piece: TetrominoType, clockwise: boolean = true): TetrominoType => {
  const originalShape = piece.shape;
  const size = originalShape.length;
  const rotated = Array(size).fill(null).map(() => Array(size).fill(0));
  
  if (clockwise) {
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        rotated[j][size - 1 - i] = originalShape[i][j];
      }
    }
  } else {
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        rotated[size - 1 - j][i] = originalShape[i][j];
      }
    }
  }
  
  return { ...piece, shape: rotated };
};

export const isValidPosition = (
  board: number[][],
  piece: GamePiece,
  newX?: number,
  newY?: number
): boolean => {
  const x = newX ?? piece.x;
  const y = newY ?? piece.y;
  
  for (let dy = 0; dy < piece.type.shape.length; dy++) {
    for (let dx = 0; dx < piece.type.shape[dy].length; dx++) {
      if (piece.type.shape[dy][dx]) {
        const boardX = x + dx;
        const boardY = y + dy;
        
        // 检查边界
        if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
          return false;
        }
        
        // 检查是否与已有方块冲突 (允许在顶部区域)
        if (boardY >= 0 && board[boardY] && board[boardY][boardX] !== 0) {
          return false;
        }
      }
    }
  }
  
  return true;
};

export const placePiece = (board: number[][], piece: GamePiece): number[][] => {
  const newBoard = board.map(row => [...row]);
  
  for (let dy = 0; dy < piece.type.shape.length; dy++) {
    for (let dx = 0; dx < piece.type.shape[dy].length; dx++) {
      if (piece.type.shape[dy][dx]) {
        const boardX = piece.x + dx;
        const boardY = piece.y + dy;
        
        if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
          newBoard[boardY][boardX] = getPieceTypeNumber(piece.type.type);
        }
      }
    }
  }
  
  return newBoard;
};

export const clearLines = (board: number[][]): { newBoard: number[][], linesCleared: number } => {
  const newBoard = [...board];
  let linesCleared = 0;
  
  // 从底部开始检查完整行
  for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
    if (newBoard[y].every(cell => cell !== 0)) {
      // 移除完整行
      newBoard.splice(y, 1);
      // 在顶部添加新的空行
      newBoard.unshift(Array(BOARD_WIDTH).fill(0));
      linesCleared++;
      y++; // 重新检查这一行，因为上面的行下移了
    }
  }
  
  return { newBoard, linesCleared };
};

export const calculateDropPosition = (board: number[][], piece: GamePiece): number => {
  let dropY = piece.y;
  
  // 找到最低可能的位置
  while (isValidPosition(board, piece, piece.x, dropY + 1)) {
    dropY++;
  }
  
  return dropY;
};

const getPieceTypeNumber = (type: string): number => {
  const typeMap: { [key: string]: number } = {
    'I': 1, 'O': 2, 'T': 3, 'S': 4, 'Z': 5, 'J': 6, 'L': 7
  };
  return typeMap[type] || 1;
};

export const generateSevenBag = (): TetrominoType[] => {
  const TETROMINOS: { [key: string]: TetrominoType } = {
    I: {
      shape: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      color: '#00f0f0',
      type: 'I'
    },
    O: {
      shape: [
        [1, 1],
        [1, 1]
      ],
      color: '#f0f000',
      type: 'O'
    },
    T: {
      shape: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
      ],
      color: '#a000f0',
      type: 'T'
    },
    S: {
      shape: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
      ],
      color: '#00f000',
      type: 'S'
    },
    Z: {
      shape: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
      ],
      color: '#f00000',
      type: 'Z'
    },
    J: {
      shape: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
      ],
      color: '#0000f0',
      type: 'J'
    },
    L: {
      shape: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
      ],
      color: '#f0a000',
      type: 'L'
    }
  };
  
  const pieces = Object.values(TETROMINOS);
  const bag = [...pieces];
  
  // Fisher-Yates shuffle
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  
  return bag;
};
