import type { TetrominoType, GamePiece, ReplayAction } from './gameTypes';
import { calculateB2BAttackBonus } from './b2bSystem';

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

// 检查给定的方块位置是否有效
export const isValidPosition = (board: number[][], piece: GamePiece): boolean => {
  const { type, x, y, rotation } = piece;
  const shape = type.shape;

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] !== 0) {
        let boardX = x + col;
        let boardY = y + row;

        if (boardX < 0 || boardX >= 10 || boardY >= 23 || boardY < 0 || board[boardY][boardX] !== 0) {
          return false;
        }
      }
    }
  }

  return true;
};

// 将方块放置在游戏面板上
export const placePiece = (board: number[][], piece: GamePiece): number[][] => {
  const { type, x, y } = piece;
  const shape = type.shape;
  const color = type.color; // 使用颜色字符串作为标记

  // 创建一个新的面板副本，以避免直接修改原始面板
  const newBoard = board.map(row => [...row]);

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] !== 0) {
        let boardX = x + col;
        let boardY = y + row;

        if (boardX >= 0 && boardX < 10 && boardY >= 0 && boardY < 23) {
          newBoard[boardY][boardX] = color as any; // 使用颜色字符串
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

  while (newBoard.length < 23) {
    newBoard.unshift(Array(10).fill(0));
  }

  return { newBoard, linesCleared };
};

// 旋转方块
export const rotatePiece = (tetromino: TetrominoType, clockwise: boolean): TetrominoType => {
  const shape = tetromino.shape;
  const rows = shape.length;
  const cols = shape[0].length;

  let newShape: number[][];

  if (clockwise) {
    newShape = Array(cols).fill(null).map(() => Array(rows).fill(0));
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        newShape[col][rows - 1 - row] = shape[row][col];
      }
    }
  } else {
    newShape = Array(cols).fill(null).map(() => Array(rows).fill(0));
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        newShape[cols - 1 - col][row] = shape[row][col];
      }
    }
  }

  return { ...tetromino, shape: newShape };
};

// 计算方块的掉落位置
export const calculateDropPosition = (board: number[][], piece: GamePiece): number => {
  let dropY = piece.y;
  while (isValidPosition(board, { ...piece, y: dropY + 1 })) {
    dropY++;
  }
  return dropY;
};

// 生成一个包含所有七种方块的随机序列
export const generateSevenBag = (): TetrominoType[] => {
  const pieceTypes = Object.values(TETROMINO_TYPES);
  let shuffledPieces = [...pieceTypes];

  // Fisher-Yates shuffle
  for (let i = shuffledPieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledPieces[i], shuffledPieces[j]] = [shuffledPieces[j], shuffledPieces[i]];
  }

  return shuffledPieces;
};

// 检查T-Spin
export const checkTSpin = (board: number[][], piece: GamePiece, lastMove: string): { type: string; isMini: boolean } | null => {
  if (piece.type.type !== 'T') {
    return null;
  }

  const { x, y } = piece;
  let cornerCount = 0;

  // 定义四个角的位置相对于T方块中心的偏移量
  const corners = [
    { dx: -1, dy: -1 }, // 左上角
    { dx: 1, dy: -1 },  // 右上角
    { dx: -1, dy: 1 },  // 左下角
    { dx: 1, dy: 1 }   // 右下角
  ];

  // 检查每个角是否被占用
  for (const corner of corners) {
    const boardX = x + 1 + corner.dx; // +1 for correct offset
    const boardY = y + 1 + corner.dy; // +1 for correct offset

    if (boardX < 0 || boardX >= 10 || boardY < 0 || boardY >= 23 || board[boardY][boardX] !== 0) {
      cornerCount++;
    }
  }

  // T-Spin的判断条件
  if (cornerCount >= 3) {
    // 进一步判断是否为Mini T-Spin
    if (lastMove === 'rotate' && cornerCount === 3) {
      return { type: 'T-Spin', isMini: true };
    } else {
      return { type: 'T-Spin', isMini: false };
    }
  }

  return null;
};

// 获取SRS踢墙测试序列
export const getKickTests = (pieceType: string, rotation: number, newRotation: number): { x: number; y: number }[] => {
  switch (pieceType) {
    case 'I':
      return getIKickTests(rotation, newRotation);
    case 'O':
      return [{ x: 0, y: 0 }]; // O方块没有踢墙
    default:
      return getStandardKickTests(rotation, newRotation);
  }
};

// I方块的踢墙测试
const getIKickTests = (rotation: number, newRotation: number): { x: number; y: number }[] => {
  const tests = [
    [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: -2 }, { x: 2, y: 1 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 2 }, { x: -2, y: -1 }],
    [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: -1 }, { x: -1, y: 2 }],
    [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 1 }, { x: 1, y: -2 }]
  ];

  const testIndex = rotation * 4 + newRotation;
  return tests[testIndex % 4];
};

// 标准踢墙测试
const getStandardKickTests = (rotation: number, newRotation: number): { x: number; y: number }[] => {
  const tests = [
    [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
    [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }]
  ];

  const testIndex = rotation * 4 + newRotation;
  return tests[testIndex % 4];
};

// 获取180度旋转的踢墙测试序列
export const get180KickTests = (pieceType: string, rotation: number): { x: number; y: number }[] => {
  switch (pieceType) {
    case 'I':
      return getI180KickTests(rotation);
    default:
      return getStandard180KickTests(rotation);
  }
};

// I方块的180度旋转踢墙测试
const getI180KickTests = (rotation: number): { x: number; y: number }[] => {
  const tests = [
    [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: -2 }, { x: 2, y: 1 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 2 }, { x: -2, y: -1 }],
    [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: -1 }, { x: -1, y: 2 }],
    [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 1 }, { x: 1, y: -2 }]
  ];

  return tests[rotation % 4];
};

// 标准180度旋转踢墙测试
const getStandard180KickTests = (rotation: number): { x: number; y: number }[] => {
  const tests = [
    [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
    [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }]
  ];

  return tests[rotation % 4];
};

// 创建新的方块
export const createNewPiece = (nextPieces: GamePiece[]): { newPiece: GamePiece | null; newNextPieces: GamePiece[] } => {
  if (nextPieces.length === 0) {
    return { newPiece: null, newNextPieces: [] };
  }

  const newPiece = nextPieces[0];
  const newNextPieces = nextPieces.slice(1);

  return { newPiece, newNextPieces };
};

// 创建幽灵方块
export const createGhostPiece = (board: number[][], piece: GamePiece): GamePiece => {
  let dropY = calculateDropPosition(board, piece);
  return { ...piece, y: dropY };
};

// 计算得分
export const calculateScore = (
  linesCleared: number,
  level: number,
  tSpin: { type: string; isMini: boolean } | null,
  b2b: boolean,
  combo: number,
  isPerfectClear: boolean
): number => {
  let score = 0;

  if (isPerfectClear) {
    score += 3500; // 全清奖励
  }

  if (tSpin) {
    if (tSpin.isMini) {
      score += level * (b2b ? 100 : 800); // Mini T-Spin
    } else {
      score += level * (b2b ? 1200 : 400); // Regular T-Spin
    }
  } else {
    switch (linesCleared) {
      case 1:
        score += 100 * level;
        break;
      case 2:
        score += 300 * level;
        break;
      case 3:
        score += 500 * level;
        break;
      case 4:
        score += 800 * level;
        break;
      default:
        break;
    }
  }

  if (combo > 0) {
    score += 50 * combo * level; // 连击奖励
  }

  return score;
};

// 计算攻击行数
export const calculateAttackLines = (
  linesCleared: number,
  tSpin: { type: string; isMini: boolean } | null,
  b2b: boolean,
  combo: number
): number => {
  let attack = 0;

  if (tSpin) {
    if (tSpin.isMini) {
      attack += b2b ? 1 : 0; // Mini T-Spin
    } else {
      attack += b2b ? 4 : 2; // Regular T-Spin
    }
  } else {
    switch (linesCleared) {
      case 1:
        attack += 0;
        break;
      case 2:
        attack += 1;
        break;
      case 3:
        attack += 2;
        break;
      case 4:
        attack += b2b ? 5 : 4;
        break;
      default:
        break;
    }
  }

  if (combo > 1) {
    attack += comboMatrix[Math.min(combo, comboMatrix.length - 1)]; // 连击奖励
  }

  return attack;
};

// 连击奖励矩阵
const comboMatrix = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5];
