
export interface TetrominoType {
  shape: number[][];
  color: string;
  name: string;
}

// 标准化方块颜色 - 与经典俄罗斯方块保持一致
export const TETROMINO_TYPES: { [key: string]: TetrominoType } = {
  I: {
    shape: [[1, 1, 1, 1]],
    color: '#00f0f0', // 青色
    name: 'I'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#f0f000', // 黄色
    name: 'O'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1]
    ],
    color: '#a000f0', // 紫色
    name: 'T'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0]
    ],
    color: '#00f000', // 绿色
    name: 'S'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1]
    ],
    color: '#f00000', // 红色
    name: 'Z'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1]
    ],
    color: '#0000f0', // 蓝色
    name: 'J'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1]
    ],
    color: '#f0a000', // 橙色
    name: 'L'
  }
};

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export const createEmptyBoard = (): number[][] => {
  return Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
};

export const generateRandomTetromino = (): TetrominoType => {
  const types = Object.keys(TETROMINO_TYPES);
  const randomType = types[Math.floor(Math.random() * types.length)];
  return TETROMINO_TYPES[randomType];
};

export const rotatePiece = (piece: number[][]): number[][] => {
  const rows = piece.length;
  const cols = piece[0].length;
  const rotated = Array(cols).fill(null).map(() => Array(rows).fill(0));
  
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      rotated[j][rows - 1 - i] = piece[i][j];
    }
  }
  
  return rotated;
};

export const isValidPosition = (
  board: number[][],
  piece: number[][],
  x: number,
  y: number
): boolean => {
  for (let i = 0; i < piece.length; i++) {
    for (let j = 0; j < piece[i].length; j++) {
      if (piece[i][j] !== 0) {
        const newX = x + j;
        const newY = y + i;
        
        if (
          newX < 0 ||
          newX >= BOARD_WIDTH ||
          newY >= BOARD_HEIGHT ||
          (newY >= 0 && board[newY][newX] !== 0)
        ) {
          return false;
        }
      }
    }
  }
  return true;
};

export const placePiece = (
  board: number[][],
  piece: number[][],
  x: number,
  y: number,
  pieceType: number
): number[][] => {
  const newBoard = board.map(row => [...row]);
  
  for (let i = 0; i < piece.length; i++) {
    for (let j = 0; j < piece[i].length; j++) {
      if (piece[i][j] !== 0 && y + i >= 0) {
        newBoard[y + i][x + j] = pieceType;
      }
    }
  }
  
  return newBoard;
};

export const clearLines = (board: number[][]): { 
  newBoard: number[][]; 
  linesCleared: number;
  clearedLineIndices: number[];
} => {
  const clearedLineIndices: number[] = [];
  
  // 找到需要清除的行
  for (let i = BOARD_HEIGHT - 1; i >= 0; i--) {
    if (board[i].every(cell => cell !== 0)) {
      clearedLineIndices.push(i);
    }
  }
  
  if (clearedLineIndices.length === 0) {
    return { newBoard: board, linesCleared: 0, clearedLineIndices: [] };
  }
  
  // 创建新的棋盘，移除满行
  const newBoard = board.filter((_, index) => !clearedLineIndices.includes(index));
  
  // 在顶部添加空行
  while (newBoard.length < BOARD_HEIGHT) {
    newBoard.unshift(Array(BOARD_WIDTH).fill(0));
  }
  
  return {
    newBoard,
    linesCleared: clearedLineIndices.length,
    clearedLineIndices
  };
};

export const calculateDropPosition = (
  board: number[][],
  piece: { type: TetrominoType; x: number; y: number }
): number => {
  let dropY = piece.y;
  
  while (isValidPosition(board, piece.type.shape, piece.x, dropY + 1)) {
    dropY++;
  }
  
  return dropY;
};

export const calculateScore = (
  linesCleared: number,
  level: number,
  isTSpin: boolean = false,
  isB2B: boolean = false,
  combo: number = 0
): number => {
  let baseScore = 0;
  
  if (linesCleared === 0) return 0;
  
  // 基础分数
  if (isTSpin) {
    switch (linesCleared) {
      case 1: baseScore = 800; break;
      case 2: baseScore = 1200; break;
      case 3: baseScore = 1600; break;
    }
  } else {
    switch (linesCleared) {
      case 1: baseScore = 100; break;
      case 2: baseScore = 300; break;
      case 3: baseScore = 500; break;
      case 4: baseScore = 800; break; // Tetris
    }
  }
  
  // Back-to-Back 加成
  if (isB2B && (linesCleared === 4 || isTSpin)) {
    baseScore = Math.floor(baseScore * 1.5);
  }
  
  // 连击加成
  if (combo > 0) {
    baseScore += combo * 50 * level;
  }
  
  return baseScore * level;
};

export const generateGarbageLines = (attackLines: number): number[][] => {
  const garbageLines: number[][] = [];
  
  for (let i = 0; i < attackLines; i++) {
    const garbageLine = Array(BOARD_WIDTH).fill(8); // 8 = 垃圾块
    const holePosition = Math.floor(Math.random() * BOARD_WIDTH);
    garbageLine[holePosition] = 0; // 留一个洞
    garbageLines.push(garbageLine);
  }
  
  return garbageLines;
};

export const addGarbageLines = (board: number[][], garbageLines: number[][]): number[][] => {
  // 移除顶部的行数等于垃圾行数
  const newBoard = board.slice(garbageLines.length);
  
  // 在底部添加垃圾行
  return [...newBoard, ...garbageLines];
};

export const calculateAttackLines = (
  linesCleared: number,
  isTSpin: boolean = false,
  isB2B: boolean = false,
  combo: number = 0
): number => {
  let attackLines = 0;
  
  if (isTSpin) {
    switch (linesCleared) {
      case 1: attackLines = 2; break;
      case 2: attackLines = 4; break;
      case 3: attackLines = 6; break;
    }
  } else {
    switch (linesCleared) {
      case 1: attackLines = 0; break;
      case 2: attackLines = 1; break;
      case 3: attackLines = 2; break;
      case 4: attackLines = 4; break; // Tetris
    }
  }
  
  // Back-to-Back 加成
  if (isB2B && attackLines > 0) {
    attackLines += 1;
  }
  
  // 连击加成
  if (combo > 0) {
    attackLines += Math.floor(combo / 2);
  }
  
  return attackLines;
};
