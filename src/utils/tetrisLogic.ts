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

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 23; // 23 internal rows, display only bottom 20

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

// 180度旋转函数
export const rotatePiece180 = (piece: TetrominoType): TetrominoType => {
  const { shape } = piece;
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated = Array(rows).fill(null).map(() => Array(cols).fill(0));
  
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      rotated[rows - 1 - i][cols - 1 - j] = shape[i][j];
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
        
        // 检查左右边界
        if (newX < 0 || newX >= BOARD_WIDTH) {
          return false;
        }
        
        // 检查底部边界
        if (newY >= BOARD_HEIGHT) {
          return false;
        }
        
        // 对于游戏区域内的位置，检查是否被占用
        // 允许方块在Y<0的位置存在（上方2行空间）
        if (newY >= 0 && board[newY][newX] !== 0) {
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

// 修复硬降落位置计算 - 确保方块真正降到底部，逐行检测碰撞
export const calculateDropPosition = (
  board: number[][],
  piece: GamePiece
): number => {
  const { shape } = piece.type;
  let dropY = piece.y;
  
  console.log('硬降落计算开始，当前Y:', dropY);
  
  // 从当前位置开始，逐行向下检查
  while (dropY < BOARD_HEIGHT) {
    let canMoveDown = true;
    
    // 检查方块的每个实体部分是否会发生碰撞
    for (let i = 0; i < shape.length && canMoveDown; i++) {
      for (let j = 0; j < shape[i].length && canMoveDown; j++) {
        if (shape[i][j] !== 0) {
          const newX = piece.x + j;
          const newY = dropY + i + 1; // 尝试向下移动一行
          
          // 检查边界和碰撞
          if (newY >= BOARD_HEIGHT || (newY >= 0 && board[newY][newX] !== 0)) {
            canMoveDown = false;
          }
        }
      }
    }
    
    if (canMoveDown) {
      dropY++;
    } else {
      break;
    }
  }
  
  console.log('硬降落计算结束，最终Y:', dropY);
  return dropY;
};

// 生成幽灵方块 - 修正显示逻辑
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

// 完全重写T-Spin检测系统 - 基于真实方块占用位置的精确计算
export const checkTSpin = (
  board: number[][],
  piece: GamePiece,
  lastAction: 'rotate' | 'move',
  wasKicked: boolean = false
): { type: string; isMini: boolean } | null => {
  if (piece.type.name !== 'T' || lastAction !== 'rotate') {
    return null;
  }

  console.log('T-Spin检测开始，方块位置:', piece.x, piece.y, '旋转状态:', piece.rotation);

  // 检查基本的移动限制 - T方块必须被适当限制才能构成T-Spin
  const canMoveLeft = isValidPosition(board, piece, -1, 0);
  const canMoveRight = isValidPosition(board, piece, 1, 0);
  const canMoveDown = isValidPosition(board, piece, 0, 1);
  
  // 如果T方块可以自由移动，则不是T-Spin
  const movementRestrictions = [!canMoveLeft, !canMoveRight, !canMoveDown].filter(x => x).length;
  if (movementRestrictions < 2) {
    console.log('移动限制不足，无法构成T-Spin');
    return null;
  }

  // 基于T方块真实占用位置计算关键角落
  const rotation = piece.rotation % 4;
  const { shape } = piece.type;
  
  // 找到T方块的中心位置（旋转轴）
  let centerX = -1, centerY = -1;
  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j < shape[i].length; j++) {
      if (shape[i][j] === 1) {
        // T方块的中心通常是第二个找到的方块位置
        if (centerX === -1) {
          centerX = j;
          centerY = i;
        } else if (Math.abs(j - centerX) <= 1 && Math.abs(i - centerY) <= 1) {
          // 找到更接近中心的位置
          if (rotation === 0 && i > centerY) { // T向上时，中心在下方
            centerX = j;
            centerY = i;
          } else if (rotation === 1 && j < centerX) { // T向右时，中心在左侧
            centerX = j;
            centerY = i;
          } else if (rotation === 2 && i < centerY) { // T向下时，中心在上方
            centerX = j;
            centerY = i;
          } else if (rotation === 3 && j > centerX) { // T向左时，中心在右侧
            centerX = j;
            centerY = i;
          }
        }
      }
    }
  }

  // 基于旋转状态和中心位置计算四个关键角落
  const boardCenterX = piece.x + centerX;
  const boardCenterY = piece.y + centerY;
  
  let corners: [number, number][] = [];
  
  switch (rotation) {
    case 0: // T向上 ┴
      corners = [
        [boardCenterX - 1, boardCenterY - 1], // 左上
        [boardCenterX + 1, boardCenterY - 1], // 右上
        [boardCenterX - 1, boardCenterY + 1], // 左下
        [boardCenterX + 1, boardCenterY + 1]  // 右下
      ];
      break;
    case 1: // T向右 ├
      corners = [
        [boardCenterX - 1, boardCenterY - 1], // 左上
        [boardCenterX + 1, boardCenterY - 1], // 右上
        [boardCenterX - 1, boardCenterY + 1], // 左下
        [boardCenterX + 1, boardCenterY + 1]  // 右下
      ];
      break;
    case 2: // T向下 ┬
      corners = [
        [boardCenterX - 1, boardCenterY - 1], // 左上
        [boardCenterX + 1, boardCenterY - 1], // 右上
        [boardCenterX - 1, boardCenterY + 1], // 左下
        [boardCenterX + 1, boardCenterY + 1]  // 右下
      ];
      break;
    case 3: // T向左 ┤
      corners = [
        [boardCenterX - 1, boardCenterY - 1], // 左上
        [boardCenterX + 1, boardCenterY - 1], // 右上
        [boardCenterX - 1, boardCenterY + 1], // 左下
        [boardCenterX + 1, boardCenterY + 1]  // 右下
      ];
      break;
  }

  console.log('T-Spin角落位置:', corners);

  // 检查每个角落是否被占用（边界外或有方块）
  let filledCorners = 0;
  let filledCornerIndices: number[] = [];
  
  corners.forEach(([x, y], index) => {
    const isOccupied = x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT || (y >= 0 && board[y] && board[y][x] !== 0);
    if (isOccupied) {
      filledCorners++;
      filledCornerIndices.push(index);
    }
  });

  console.log('被占用的角落数量:', filledCorners, '索引:', filledCornerIndices);

  // 必须至少有3个角落被占用才能构成T-Spin
  if (filledCorners < 3) {
    console.log('占用角落不足3个，无法构成T-Spin');
    return null;
  }

  // 精确的T-Spin Mini判定 - 基于标准规则
  let isMini = false;
  
  switch (rotation) {
    case 0: // T向上：如果前方两角(0,1)都被占用，则为Mini
      isMini = filledCornerIndices.includes(0) && filledCornerIndices.includes(1);
      break;
    case 1: // T向右：如果前方两角(1,3)都被占用，则为Mini
      isMini = filledCornerIndices.includes(1) && filledCornerIndices.includes(3);
      break;
    case 2: // T向下：如果前方两角(2,3)都被占用，则为Mini
      isMini = filledCornerIndices.includes(2) && filledCornerIndices.includes(3);
      break;
    case 3: // T向左：如果前方两角(0,2)都被占用，则为Mini
      isMini = filledCornerIndices.includes(0) && filledCornerIndices.includes(2);
      break;
  }

  console.log('T-Spin检测结果:', isMini ? 'T-Spin Mini' : 'T-Spin', '旋转状态:', rotation);
  
  return { type: 'T-Spin', isMini };
};

export const getKickTests = (
  pieceType: string,
  fromRotation: number,
  toRotation: number
): { x: number; y: number }[] => {
  // I型方块的特殊踢墙数据（标准SRS）
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

  // O型方块不需要踢墙（正方形）
  if (pieceType === 'O') {
    return [{ x: 0, y: 0 }];
  }

  // 其他方块（T, S, Z, J, L）的标准SRS踢墙数据
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

// 180度旋转的踢墙数据
export const get180KickTests = (
  pieceType: string,
  fromRotation: number
): { x: number; y: number }[] => {
  // I型方块的180度旋转踢墙数据
  if (pieceType === 'I') {
    const i180KickData: { [key: string]: { x: number; y: number }[] } = {
      '0': [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: 0 }, { x: -1, y: 0 }],
      '1': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 2 }, { x: 1, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 1 }],
      '2': [{ x: 0, y: 0 }, { x: 0, y: -1 }, { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 0 }, { x: 1, y: 0 }],
      '3': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 2 }, { x: -1, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 1 }]
    };
    
    return i180KickData[fromRotation.toString()] || [{ x: 0, y: 0 }];
  }

  // O型方块180度旋转
  if (pieceType === 'O') {
    return [{ x: 0, y: 0 }];
  }

  // 其他方块的180度旋转踢墙数据
  const normal180KickData: { [key: string]: { x: number; y: number }[] } = {
    '0': [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: 0 }, { x: -1, y: 0 }],
    '1': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: 0, y: -1 }, { x: 0, y: 1 }],
    '2': [{ x: 0, y: 0 }, { x: 0, y: -1 }, { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 0 }, { x: 1, y: 0 }],
    '3': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: -1, y: 1 }, { x: 0, y: -1 }, { x: 0, y: 1 }]
  };
  
  return normal180KickData[fromRotation.toString()] || [{ x: 0, y: 0 }];
};

export const calculateScore = (
  linesCleared: number,
  level: number,
  tSpinResult: { type: string; isMini: boolean } | null = null,
  isB2B: boolean = false,
  combo: number = 0,
  isPerfectClear: boolean = false
): number => {
  let baseScore = 0;
  
  if (linesCleared === 0) return 0;
  
  // 基础分数计算
  if (tSpinResult) {
    if (tSpinResult.isMini) {
      // T-Spin Mini 得分
      switch (linesCleared) {
        case 0: baseScore = 100; break; // T-Spin Mini
        case 1: baseScore = 200; break; // T-Spin Mini Single
        case 2: baseScore = 400; break; // T-Spin Mini Double
      }
    } else {
      // 普通 T-Spin 得分
      switch (linesCleared) {
        case 0: baseScore = 400; break; // T-Spin
        case 1: baseScore = 800; break; // T-Spin Single
        case 2: baseScore = 1200; break; // T-Spin Double
        case 3: baseScore = 1600; break; // T-Spin Triple
      }
    }
  } else {
    // 普通消行得分
    switch (linesCleared) {
      case 1: baseScore = 100; break;
      case 2: baseScore = 300; break;
      case 3: baseScore = 500; break;
      case 4: baseScore = 800; break; // Tetris
    }
  }
  
  // 全清加成
  if (isPerfectClear) {
    baseScore += 3500;
  }
  
  // Back-to-Back 加成（+50%）
  if (isB2B && (linesCleared === 4 || tSpinResult)) {
    baseScore = Math.floor(baseScore * 1.5);
  }
  
  // 连击加成
  if (combo > 0) {
    baseScore += combo * 50;
  }
  
  return baseScore * level;
};

// 计算攻击力 - 整合新的B2B奖励系统
export const calculateAttackLines = (
  linesCleared: number,
  tSpinResult: { type: string; isMini: boolean } | null = null,
  isB2B: boolean = false,
  combo: number = 0,
  b2bCount: number = 0
): number => {
  let attackLines = 0;
  
  if (tSpinResult) {
    if (tSpinResult.isMini) {
      switch (linesCleared) {
        case 1: attackLines = 0; break;
        case 2: attackLines = 1; break;
      }
    } else {
      switch (linesCleared) {
        case 1: attackLines = 2; break;
        case 2: attackLines = 4; break;
        case 3: attackLines = 6; break;
      }
    }
  } else {
    switch (linesCleared) {
      case 1: attackLines = 0; break;
      case 2: attackLines = 1; break;
      case 3: attackLines = 2; break;
      case 4: attackLines = 4; break; // Tetris
    }
  }
  
  // 新的B2B奖励系统
  if (isB2B && attackLines > 0) {
    const b2bBonus = calculateB2BAttackBonus(b2bCount);
    attackLines += b2bBonus;
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

// 创建新方块，确保出现在顶部中央 - 修正位置计算，方块从上方3行生成以支持极限消除
export const createNewPiece = (type: TetrominoType): GamePiece => {
  // 方块居中生成，考虑实际形状
  const startX = Math.floor((BOARD_WIDTH - type.shape[0].length) / 2);
  
  // 固定从游戏区域上方3行开始生成，为极限情况留出足够的空间进行消除
  const startY = -3;
  
  return {
    type,
    x: startX,
    y: startY,
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
