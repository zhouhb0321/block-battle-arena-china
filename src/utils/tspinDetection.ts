import type { GamePiece } from './gameTypes';

// 标准SRS T-Spin检测系统
export interface TSpin {
  type: 'T-Spin' | 'Mini T-Spin';
  isMini: boolean;
  level: 'T1' | 'T2' | 'T3'; // 添加T-Spin级别
}

// T块在标准SRS下每个旋转状态的实际形状定义
const T_PIECE_SHAPES = {
  0: [ // North (0度) - T块朝上
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  1: [ // East (90度) - T块朝右
    [0, 1, 0],
    [0, 1, 1],
    [0, 1, 0]
  ],
  2: [ // South (180度) - T块朝下
    [0, 0, 0],
    [1, 1, 1],
    [0, 1, 0]
  ],
  3: [ // West (270度) - T块朝左
    [0, 1, 0],
    [1, 1, 0],
    [0, 1, 0]
  ]
};

// T块在每个旋转状态下的角落定义（基于T块的实际形状）
const T_PIECE_CORNERS = {
  0: { // North - T块朝上，中心位置是(1,1)
    frontCorners: [0, 1], // 上方两个角落 (左上, 右上)
    backCorners: [2, 3],  // 下方两个角落 (左下, 右下)
    center: { x: 1, y: 1 }
  },
  1: { // East - T块朝右
    frontCorners: [1, 3], // 右方两个角落 (右上, 右下)
    backCorners: [0, 2],  // 左方两个角落 (左上, 左下)
    center: { x: 1, y: 1 }
  },
  2: { // South - T块朝下
    frontCorners: [2, 3], // 下方两个角落 (左下, 右下)
    backCorners: [0, 1],  // 上方两个角落 (左上, 右上)
    center: { x: 1, y: 1 }
  },
  3: { // West - T块朝左
    frontCorners: [0, 2], // 左方两个角落 (左上, 左下)
    backCorners: [1, 3],  // 右方两个角落 (右上, 右下)
    center: { x: 1, y: 1 }
  }
};

// 检测指定位置是否被占用（包括边界外）
const isPositionOccupied = (board: number[][], x: number, y: number): boolean => {
  // 边界外视为被占用
  if (x < 0 || x >= 10 || y < 0 || y >= board.length) {
    return true;
  }
  // 检查board位置是否有方块
  return board[y][x] !== 0;
};

// 获取T块周围的四个角落坐标（基于实际T块形状）
const getTCorners = (piece: GamePiece): { x: number; y: number }[] => {
  const rotation = piece.rotation % 4;
  const cornerData = T_PIECE_CORNERS[rotation as keyof typeof T_PIECE_CORNERS];
  
  // T块的实际中心位置
  const centerX = piece.x + cornerData.center.x;
  const centerY = piece.y + cornerData.center.y;
  
  console.log(`T块位置: (${piece.x}, ${piece.y}), 旋转: ${rotation * 90}度, 中心: (${centerX}, ${centerY})`);
  
  return [
    { x: centerX - 1, y: centerY - 1 }, // 左上角 (0)
    { x: centerX + 1, y: centerY - 1 }, // 右上角 (1)
    { x: centerX - 1, y: centerY + 1 }, // 左下角 (2)
    { x: centerX + 1, y: centerY + 1 }  // 右下角 (3)
  ];
};

// 标准SRS T-Spin检测函数（修复版本）
export const detectTSpin = (
  board: number[][],
  piece: GamePiece,
  lastMove: string,
  wasKicked: boolean = false
): TSpin | null => {
  // 只检测T块
  if (piece.type.type !== 'T') {
    return null;
  }
  
  // 只有旋转动作才能触发T-Spin
  if (lastMove !== 'rotate') {
    return null;
  }
  
  console.log(`T-Spin检测开始: 位置(${piece.x}, ${piece.y}), 旋转${piece.rotation * 90}度, 踢墙=${wasKicked}`);
  
  // SRS标准：T块中心点位置
  const centerX = piece.x + 1;
  const centerY = piece.y + 1;
  
  // 四个角落的坐标（相对于中心点）
  const corners = [
    { x: centerX - 1, y: centerY - 1 }, // 左上 (0)
    { x: centerX + 1, y: centerY - 1 }, // 右上 (1) 
    { x: centerX - 1, y: centerY + 1 }, // 左下 (2)
    { x: centerX + 1, y: centerY + 1 }  // 右下 (3)
  ];
  
  // 根据旋转状态确定前角（T块朝向的两个角）
  const rotation = piece.rotation % 4;
  let frontCornerIndices: number[] = [];
  
  if (rotation === 0) frontCornerIndices = [0, 1]; // 朝上 - 上方两角
  else if (rotation === 1) frontCornerIndices = [1, 3]; // 朝右 - 右方两角
  else if (rotation === 2) frontCornerIndices = [2, 3]; // 朝下 - 下方两角  
  else if (rotation === 3) frontCornerIndices = [0, 2]; // 朝左 - 左方两角
  
  // 检查每个角落的占用状态
  let occupiedCorners = 0;
  let frontCornersOccupied = 0;
  
  corners.forEach((corner, idx) => {
    // 检查边界外或有方块都算占用
    const isOccupied = corner.x < 0 || corner.x >= 10 || 
                      corner.y < 0 || corner.y >= board.length || 
                      board[corner.y][corner.x] !== 0;
    
    if (isOccupied) {
      occupiedCorners++;
      if (frontCornerIndices.includes(idx)) {
        frontCornersOccupied++;
      }
    }
    
    console.log(`角落${idx} (${corner.x}, ${corner.y}): ${isOccupied ? '占用' : '空闲'} ${frontCornerIndices.includes(idx) ? '[前角]' : '[后角]'}`);
  });
  
  console.log(`T-Spin检测结果: 总占用角落=${occupiedCorners}, 前角占用=${frontCornersOccupied}`);
  
  // T-Spin判定：至少3个角落被占用
  if (occupiedCorners >= 3) {
    // Mini T-Spin判定：前角占用数量少于2个
    const isMini = frontCornersOccupied < 2;
    
    // 确定T-Spin级别
    let level: 'T1' | 'T2' | 'T3';
    if (occupiedCorners === 3) {
      level = 'T1';
    } else if (occupiedCorners === 4 && frontCornersOccupied === 2) {
      level = 'T2';
    } else {
      level = 'T3';
    }
    
    const result: TSpin = {
      type: isMini ? 'Mini T-Spin' : 'T-Spin',
      isMini,
      level
    };
    
    console.log(`✅ T-Spin确认: ${result.type} ${result.level}, Mini=${isMini}, 踢墙=${wasKicked}`);
    return result;
  }
  
  console.log(`❌ 不是T-Spin: 角落占用不足`);
  return null;
};

// 用于调试的辅助函数 - 显示T块周围状态
export const debugTSpinSetup = (board: number[][], piece: GamePiece): void => {
  if (piece.type.type !== 'T') return;
  
  console.log('=== T-Spin调试信息 ===');
  console.log(`当前T块旋转状态: ${piece.rotation * 90}度`);
  console.log('当前T块周围状态:');
  
  const corners = getTCorners(piece);
  const rotation = piece.rotation % 4;
  const cornerData = T_PIECE_CORNERS[rotation as keyof typeof T_PIECE_CORNERS];
  
  corners.forEach((corner, index) => {
    const isOccupied = isPositionOccupied(board, corner.x, corner.y);
    const isFront = cornerData.frontCorners.includes(index);
    const positionType = isFront ? '前角' : '后角';
    console.log(`角落${index} (${corner.x}, ${corner.y}): ${isOccupied ? '占用' : '空闲'} [${positionType}]`);
  });
  
  // 显示T块当前形状
  const shape = T_PIECE_SHAPES[rotation as keyof typeof T_PIECE_SHAPES];
  console.log('当前T块形状:');
  shape.forEach((row, y) => {
    const rowStr = row.map(cell => cell ? '█' : '·').join(' ');
    console.log(`  ${rowStr}`);
  });
  
  console.log('=== 调试信息结束 ===');
};

// 创建T-Spin测试场景
export const createTSpinTestScenario = (board: number[][]): void => {
  console.log('=== 创建T-Spin测试场景 ===');
  
  // 清空顶部区域
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 10; x++) {
      board[y][x] = 0;
    }
  }
  
  // 创建一个典型的T-Spin Triple场景
  // 在底部创建一个T形凹槽
  const testPattern = [
    [1, 1, 1, 0, 0, 0, 1, 1, 1, 1], // y = 20
    [1, 1, 1, 0, 1, 0, 1, 1, 1, 1], // y = 21
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // y = 22
  ];
  
  // 应用测试模式到游戏板底部
  for (let i = 0; i < testPattern.length; i++) {
    const targetY = board.length - testPattern.length + i;
    if (targetY >= 0) {
      for (let x = 0; x < 10; x++) {
        board[targetY][x] = testPattern[i][x];
      }
    }
  }
  
  console.log('T-Spin测试场景已创建，可在位置(3, 18)放置T块进行测试');
  console.log('=== 测试场景创建完成 ===');
};
