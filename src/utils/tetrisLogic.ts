
import type { TetrominoType, GamePiece, ReplayAction } from './gameTypes';

// 标准化方块颜色 - 与经典俄罗斯方块保持一致
export const TETROMINO_TYPES: { [key: string]: TetrominoType } = {
  I: {
    shape: [[1, 1, 1, 1]],
    color: '#00f0f0', // 青色
    name: 'I',
    type: 'I'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#f0f000', // 黄色
    name: 'O',
    type: 'O'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1]
    ],
    color: '#a000f0', // 紫色
    name: 'T',
    type: 'T'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0]
    ],
    color: '#00f000', // 绿色
    name: 'S',
    type: 'S'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1]
    ],
    color: '#f00000', // 红色
    name: 'Z',
    type: 'Z'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1]
    ],
    color: '#0000f0', // 蓝色
    name: 'J',
    type: 'J'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1]
    ],
    color: '#f0a000', // 橙色
    name: 'L',
    type: 'L'
  }
};

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export const createEmptyBoard = (): number[][] => {
  return Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
};

// 7-bag 随机系统 - 确保每7个方块包含所有类型且无重复
export const generateSevenBag = (): TetrominoType[] => {
  const pieces = Object.values(TETROMINO_TYPES);
  const bag = [...pieces];
  
  // Fisher-Yates shuffle
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  
  return bag;
};

export const rotatePiece = (piece: TetrominoType, clockwise: boolean = true): TetrominoType => {
  const { shape } = piece;
  let rotated: number[][];
  
  if (clockwise) {
    const rows = shape.length;
    const cols = shape[0].length;
    rotated = Array(cols).fill(null).map(() => Array(rows).fill(0));
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        rotated[j][rows - 1 - i] = shape[i][j];
      }
    }
  } else {
    const rows = shape.length;
    const cols = shape[0].length;
    rotated = Array(cols).fill(null).map(() => Array(rows).fill(0));
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        rotated[cols - 1 - j][i] = shape[i][j];
      }
    }
  }
  
  return {
    ...piece,
    shape: rotated
  };
};

export const isValidPosition = (
  board: number[][],
  piece: GamePiece,
  offsetX: number = 0,
  offsetY: number = 0
): boolean => {
  const { shape } = piece.type;
  const x = piece.x + offsetX;
  const y = piece.y + offsetY;
  
  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j < shape[i].length; j++) {
      if (shape[i][j] !== 0) {
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
  piece: GamePiece
): number[][] => {
  const newBoard = board.map(row => [...row]);
  const { shape } = piece.type;
  const pieceTypeIndex = Object.keys(TETROMINO_TYPES).indexOf(piece.type.name) + 1;
  
  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j < shape[i].length; j++) {
      if (shape[i][j] !== 0 && piece.y + i >= 0) {
        newBoard[piece.y + i][piece.x + j] = pieceTypeIndex;
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

// 计算幽灵方块位置
export const calculateDropPosition = (
  board: number[][],
  piece: GamePiece
): number => {
  let dropY = piece.y;
  
  while (isValidPosition(board, { ...piece, y: dropY + 1 })) {
    dropY++;
  }
  
  return dropY;
};

// 生成幽灵方块
export const createGhostPiece = (
  board: number[][],
  piece: GamePiece
): GamePiece | null => {
  if (!piece) return null;
  
  const ghostY = calculateDropPosition(board, piece);
  
  // 如果幽灵位置和当前位置相同，不显示幽灵
  if (ghostY === piece.y) return null;
  
  return {
    ...piece,
    y: ghostY
  };
};

// T-Spin检测
export const checkTSpin = (
  board: number[][],
  piece: GamePiece,
  lastAction: 'rotate' | 'move'
): string | null => {
  if (piece.type.name !== 'T' || lastAction !== 'rotate') {
    return null;
  }

  const corners = [
    [piece.x, piece.y], // 左上
    [piece.x + 2, piece.y], // 右上
    [piece.x, piece.y + 2], // 左下
    [piece.x + 2, piece.y + 2] // 右下
  ];

  let filledCorners = 0;
  corners.forEach(([x, y]) => {
    if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT || board[y]?.[x] !== 0) {
      filledCorners++;
    }
  });

  if (filledCorners >= 3) {
    return 'T-Spin';
  }

  return null;
};

// SRS 踢墙数据
export const getKickTests = (
  pieceType: string,
  fromRotation: number,
  toRotation: number
): { x: number; y: number }[] => {
  // I型方块特殊踢墙数据
  if (pieceType === 'I') {
    const iKickData: { [key: string]: { x: number; y: number }[] } = {
      '0->1': [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: -1 }, { x: 1, y: 2 }],
      '1->0': [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 1 }, { x: -1, y: -2 }],
      '1->2': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 2 }, { x: 2, y: -1 }],
      '2->1': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: -2 }, { x: -2, y: 1 }],
      '2->3': [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 1 }, { x: -1, y: -2 }],
      '3->2': [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: -1 }, { x: 1, y: 2 }],
      '3->0': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: -2 }, { x: -2, y: 1 }],
      '0->3': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 2 }, { x: 2, y: -1 }]
    };
    
    const key = `${fromRotation}->${toRotation}`;
    return iKickData[key] || [{ x: 0, y: 0 }];
  }

  // 其他方块的标准踢墙数据
  const normalKickData: { [key: string]: { x: number; y: number }[] } = {
    '0->1': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
    '1->0': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
    '1->2': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
    '2->1': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
    '2->3': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
    '3->2': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
    '3->0': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
    '0->3': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }]
  };
  
  const key = `${fromRotation}->${toRotation}`;
  return normalKickData[key] || [{ x: 0, y: 0 }];
};

// 计算得分 - 基于tetr.io系统
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

// 计算攻击力
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

// 生成垃圾行
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

// 添加垃圾行到棋盘
export const addGarbageLines = (board: number[][], garbageLines: number[][]): number[][] => {
  // 移除顶部的行数等于垃圾行数
  const newBoard = board.slice(garbageLines.length);
  
  // 在底部添加垃圾行
  return [...newBoard, ...garbageLines];
};

// 创建新方块，确保出现在顶部中央
export const createNewPiece = (type: TetrominoType): GamePiece => {
  return {
    type,
    x: Math.floor(BOARD_WIDTH / 2) - Math.floor(type.shape[0].length / 2),
    y: -1, // 从顶部上方开始，允许部分隐藏
    rotation: 0
  };
};

// 回放系统 - 记录动作而不是视频
export const createReplayAction = (
  action: 'move' | 'rotate' | 'drop' | 'hold' | 'place',
  data: any
): ReplayAction => {
  return {
    timestamp: Date.now(),
    action,
    data
  };
};
