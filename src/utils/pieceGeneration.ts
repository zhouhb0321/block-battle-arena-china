
import type { TetrominoType, GamePiece } from './gameTypes';

// 柔和的方块颜色 - 降低亮度和饱和度，减少视觉刺激
export const TETROMINO_TYPES: { [key: string]: TetrominoType } = {
  I: {
    shape: [[1, 1, 1, 1]],
    color: '#4a9d9c', // 柔和的青色
    name: 'I',
    type: 'I'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#c4a661', // 柔和的黄色
    name: 'O',
    type: 'O'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1]
    ],
    color: '#8b6bb1', // 柔和的紫色
    name: 'T',
    type: 'T'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0]
    ],
    color: '#6b9b6b', // 柔和的绿色
    name: 'S',
    type: 'S'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1]
    ],
    color: '#b87575', // 柔和的红色
    name: 'Z',
    type: 'Z'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1]
    ],
    color: '#5d7fb8', // 柔和的蓝色
    name: 'J',
    type: 'J'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1]
    ],
    color: '#c4906b', // 柔和的橙色
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

// 全局7-bag状态
let currentBag: TetrominoType[] = [];
let bagIndex = 0;

// 生成一个包含所有七种方块的随机序列（7-bag系统）
export const generateSevenBag = (): TetrominoType[] => {
  const pieceTypes = Object.values(TETROMINO_TYPES);
  let shuffledPieces = [...pieceTypes];

  // Fisher-Yates shuffle算法
  for (let i = shuffledPieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledPieces[i], shuffledPieces[j]] = [shuffledPieces[j], shuffledPieces[i]];
  }

  return shuffledPieces;
};

// 使用7-bag系统生成随机方块
export const generateRandomPiece = (): TetrominoType => {
  // 如果当前bag为空或已经用完，生成新的bag
  if (currentBag.length === 0 || bagIndex >= currentBag.length) {
    currentBag = generateSevenBag();
    bagIndex = 0;
  }
  
  const piece = currentBag[bagIndex];
  bagIndex++;
  
  return piece;
};

// 重置7-bag系统（游戏重新开始时调用）
export const resetSevenBag = (): void => {
  currentBag = [];
  bagIndex = 0;
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

// 旋转方块
export const rotatePiece = (tetromino: TetrominoType, clockwise: boolean = true): TetrominoType => {
  const shape = tetromino.shape;
  const rows = shape.length;
  const cols = shape[0].length;
  let newShape: number[][];
  // 以SRS中心点为基准旋转
  if (tetromino.type === 'I') {
    // I块特殊：4x4矩阵，中心点(1.5,0.5)
    const N = 4;
    newShape = Array(N).fill(null).map(() => Array(N).fill(0));
    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        if (clockwise) {
          newShape[col][N - 1 - row] = (shape[row] && shape[row][col]) || 0;
        } else {
          newShape[N - 1 - col][row] = (shape[row] && shape[row][col]) || 0;
        }
      }
    }
  } else if (tetromino.type === 'O') {
    // O块特殊：2x2，中心点(0.5,0.5)，旋转不变
    newShape = shape.map(row => [...row]);
  } else {
    // 其它块：3x3，中心点(1,1)
    const N = 3;
    newShape = Array(N).fill(null).map(() => Array(N).fill(0));
    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        if (clockwise) {
          newShape[col][N - 1 - row] = (shape[row] && shape[row][col]) || 0;
        } else {
          newShape[N - 1 - col][row] = (shape[row] && shape[row][col]) || 0;
        }
      }
    }
  }
  return { ...tetromino, shape: newShape };
};
