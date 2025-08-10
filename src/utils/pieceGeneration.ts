
import type { TetrominoType, GamePiece } from './gameTypes';

// 标准鲜明方块颜色 - 确保在所有主题下都清晰可见，与blockColors.ts保持一致
export const TETROMINO_TYPES: { [key: string]: TetrominoType } = {
  I: {
    shape: [[1, 1, 1, 1]],
    color: '#00FFFF', // 亮青色
    name: 'I',
    type: 'I'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#FFFF00', // 亮黄色
    name: 'O',
    type: 'O'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1]
    ],
    color: '#AA00FF', // 亮紫色
    name: 'T',
    type: 'T'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0]
    ],
    color: '#00FF00', // 亮绿色
    name: 'S',
    type: 'S'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1]
    ],
    color: '#FF0000', // 亮红色
    name: 'Z',
    type: 'Z'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1]
    ],
    color: '#0088FF', // 亮蓝色
    name: 'J',
    type: 'J'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1]
    ],
    color: '#FF8800', // 亮橙色
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

import { SeededRandom } from './replayCompression';

// 全局7-bag状态
let currentBag: TetrominoType[] = [];
let bagIndex = 0;
// 使用当前时间戳作为默认种子，确保每次游戏会话的随机性不同
let randomGenerator = new SeededRandom(Date.now().toString());

// 生成一个包含所有七种方块的随机序列（7-bag系统）
export const generateSevenBag = (): TetrominoType[] => {
  const pieceTypes = Object.values(TETROMINO_TYPES);
  let shuffledPieces = [...pieceTypes];

  // Fisher-Yates shuffle算法，使用带种子的随机数生成器
  for (let i = shuffledPieces.length - 1; i > 0; i--) {
    const j = Math.floor(randomGenerator.next() * (i + 1));
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
export const resetSevenBag = (seed?: string): void => {
  if (seed) {
    randomGenerator = new SeededRandom(seed);
  } else {
    // 如果没有提供种子，则使用新的时间戳来重置，以保证非回放模式下的随机性
    randomGenerator = new SeededRandom(Date.now().toString());
  }
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
