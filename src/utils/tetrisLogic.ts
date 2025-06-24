
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

// T-Spin检测逻辑
export const checkTSpin = (board: number[][], piece: GamePiece, lastAction: 'rotate' | 'move'): 'T-Spin-Single' | 'T-Spin-Double' | 'T-Spin-Triple' | 'Mini T-Spin' | null => {
  if (piece.type.type !== 'T' || lastAction !== 'rotate') {
    return null;
  }

  // 检查T块的四个角落
  const centerX = piece.x + 1; // T块的中心点
  const centerY = piece.y + 1;
  
  const corners = [
    { x: centerX - 1, y: centerY - 1 }, // 左上
    { x: centerX + 1, y: centerY - 1 }, // 右上
    { x: centerX - 1, y: centerY + 1 }, // 左下
    { x: centerX + 1, y: centerY + 1 }  // 右下
  ];
  
  let filledCorners = 0;
  corners.forEach(corner => {
    if (corner.x < 0 || corner.x >= BOARD_WIDTH || 
        corner.y < 0 || corner.y >= BOARD_HEIGHT ||
        (corner.y >= 0 && board[corner.y] && board[corner.y][corner.x] !== 0)) {
      filledCorners++;
    }
  });
  
  // T-Spin需要至少3个角被填充
  if (filledCorners >= 3) {
    // 检查将要消除的行数
    const tempBoard = placePiece(board, piece);
    const { linesCleared } = clearLines(tempBoard);
    
    if (linesCleared === 1) return 'T-Spin-Single';
    if (linesCleared === 2) return 'T-Spin-Double';
    if (linesCleared === 3) return 'T-Spin-Triple';
    if (filledCorners === 3) return 'Mini T-Spin';
  }
  
  return null;
};

export const clearLines = (board: number[][]): { newBoard: number[][], linesCleared: number, clearedRows: number[] } => {
  const newBoard = [...board];
  let linesCleared = 0;
  const clearedRows: number[] = [];
  
  // 从底部开始检查完整行
  for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
    if (newBoard[y].every(cell => cell !== 0)) {
      clearedRows.push(y);
      // 移除完整行
      newBoard.splice(y, 1);
      // 在顶部添加新的空行
      newBoard.unshift(Array(BOARD_WIDTH).fill(0));
      linesCleared++;
      y++; // 重新检查这一行，因为上面的行下移了
    }
  }
  
  return { newBoard, linesCleared, clearedRows };
};

export const calculateDropPosition = (board: number[][], piece: GamePiece): number => {
  let dropY = piece.y;
  
  // 找到最低可能的位置
  while (isValidPosition(board, piece, piece.x, dropY + 1)) {
    dropY++;
  }
  
  return dropY;
};

// 超级旋转系统 (SRS) 的墙踢数据
export const getKickTests = (pieceType: string, fromRotation: number, toRotation: number): { x: number, y: number }[] => {
  const isIPiece = pieceType === 'I';
  
  if (isIPiece) {
    // I块的特殊墙踢
    const kickData: { [key: string]: { x: number, y: number }[] } = {
      '0->1': [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: -1 }, { x: 1, y: 2 }],
      '1->0': [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 1 }, { x: -1, y: -2 }],
      '1->2': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 2 }, { x: 2, y: -1 }],
      '2->1': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: -2 }, { x: -2, y: 1 }],
      '2->3': [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 1 }, { x: -1, y: -2 }],
      '3->2': [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: -1 }, { x: 1, y: 2 }],
      '3->0': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: -2 }, { x: -2, y: 1 }],
      '0->3': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 2 }, { x: 2, y: -1 }]
    };
    return kickData[`${fromRotation}->${toRotation}`] || [{ x: 0, y: 0 }];
  } else {
    // 其他块的标准墙踢
    const kickData: { [key: string]: { x: number, y: number }[] } = {
      '0->1': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
      '1->0': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
      '1->2': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
      '2->1': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
      '2->3': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
      '3->2': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
      '3->0': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
      '0->3': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }]
    };
    return kickData[`${fromRotation}->${toRotation}`] || [{ x: 0, y: 0 }];
  }
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
