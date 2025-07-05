import type { TetrominoType, GamePiece, ReplayAction } from './gameTypes';
import { calculateB2BAttackBonus } from './b2bSystem';
import { detectTSpin } from './tspinDetection';

// Board constants
export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 23;

// Create empty board
export const createEmptyBoard = (): number[][] => {
  return Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
};

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

// 方块类型编号映射（用于存储在棋盘上）
export const TETROMINO_TYPE_IDS: { [key: string]: number } = {
  I: 1,
  O: 2, 
  T: 3,
  S: 4,
  Z: 5,
  J: 6,
  L: 7
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

// 旋转方块
export const rotatePiece = (tetromino: TetrominoType, clockwise: boolean = true): TetrominoType => {
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

// 创建新的方块
export const createNewPiece = (pieceType: TetrominoType): GamePiece => {
  return {
    type: pieceType,
    x: 4,
    y: 0,
    rotation: 0
  };
};

// 创建幽灵方块
export const createGhostPiece = (board: number[][], piece: GamePiece): GamePiece => {
  let dropY = calculateDropPosition(board, piece);
  return { ...piece, y: dropY };
};

// 使用新的T-Spin检测系统，集成踢墙状态
export const checkTSpin = (
  board: number[][], 
  piece: GamePiece, 
  lastMove: string, 
  wasKicked: boolean = false
): { type: string; isMini: boolean } | null => {
  const result = detectTSpin(board, piece, lastMove, wasKicked);
  if (result) {
    return {
      type: result.type,
      isMini: result.isMini
    };
  }
  return null;
};

// 改进的SRS踢墙测试，返回踢墙状态
export const performSRSRotation = (
  board: number[][],
  piece: GamePiece,
  clockwise: boolean = true
): { success: boolean; newPiece: GamePiece | null; wasKicked: boolean } => {
  const rotated = rotatePiece(piece.type, clockwise);
  const newRotation = clockwise 
    ? (piece.rotation + 1) % 4 
    : (piece.rotation + 3) % 4;
  
  // 获取SRS踢墙测试序列
  const kickTests = getKickTests(
    piece.type.type,
    piece.rotation,
    newRotation
  );
  
  console.log(`SRS旋转测试开始: ${piece.type.type}块 ${piece.rotation}->${newRotation}`);
  
  // 按照SRS规则测试每个踢墙位置
  for (let i = 0; i < kickTests.length; i++) {
    const kick = kickTests[i];
    const testPiece: GamePiece = {
      ...piece,
      type: rotated,
      x: piece.x + kick.x,
      y: piece.y + kick.y,
      rotation: newRotation
    };
    
    console.log(`踢墙测试 ${i}: 偏移(${kick.x}, ${kick.y}) -> 位置(${testPiece.x}, ${testPiece.y})`);
    
    if (isValidPosition(board, testPiece)) {
      const wasKicked = i > 0;
      console.log(`✅ 旋转成功! ${wasKicked ? '踢墙成功' : '原地旋转'}`);
      
      return {
        success: true,
        newPiece: testPiece,
        wasKicked
      };
    }
  }
  
  console.log(`❌ 旋转失败: 所有踢墙测试都无效`);
  return {
    success: false,
    newPiece: null,
    wasKicked: false
  };
};

// 180度旋转的SRS测试
export const performSRS180Rotation = (
  board: number[][],
  piece: GamePiece
): { success: boolean; newPiece: GamePiece | null; wasKicked: boolean } => {
  const rotated = rotatePiece(rotatePiece(piece.type, true), true); // 旋转两次
  const newRotation = (piece.rotation + 2) % 4;
  
  // 获取180度旋转的踢墙测试序列
  const kickTests = get180KickTests(piece.type.type, piece.rotation);
  
  console.log(`SRS 180度旋转测试开始: ${piece.type.type}块`);
  
  for (let i = 0; i < kickTests.length; i++) {
    const kick = kickTests[i];
    const testPiece: GamePiece = {
      ...piece,
      type: rotated,
      x: piece.x + kick.x,
      y: piece.y + kick.y,
      rotation: newRotation
    };
    
    if (isValidPosition(board, testPiece)) {
      const wasKicked = i > 0;
      console.log(`✅ 180度旋转成功! ${wasKicked ? '踢墙成功' : '原地旋转'}`);
      
      return {
        success: true,
        newPiece: testPiece,
        wasKicked
      };
    }
  }
  
  console.log(`❌ 180度旋转失败`);
  return {
    success: false,
    newPiece: null,
    wasKicked: false
  };
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

// 标准踢墙测试 - 优化边缘情况
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

// 计算得分 - 修正参数数量
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

// 计算攻击行数 - 修正参数数量
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
