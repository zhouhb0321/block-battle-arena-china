
import type { GamePiece } from './gameTypes';

// 标准SRS T-Spin检测系统
export interface TSpin {
  type: 'T-Spin' | 'Mini T-Spin';
  isMini: boolean;
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

// 标准SRS T-Spin检测函数
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

  const rotation = piece.rotation % 4;
  const corners = getTCorners(piece);
  const cornerData = T_PIECE_CORNERS[rotation as keyof typeof T_PIECE_CORNERS];
  
  console.log(`=== T-Spin检测开始 ===`);
  console.log(`T块位置: (${piece.x}, ${piece.y}), 旋转: ${rotation * 90}度`);
  console.log(`是否踢墙: ${wasKicked}`);
  console.log(`最后动作: ${lastMove}`);
  
  let occupiedCorners = 0;
  let frontCornersOccupied = 0;
  const cornerStatus: boolean[] = [];
  
  // 检查四个角落
  corners.forEach((corner, index) => {
    const isOccupied = isPositionOccupied(board, corner.x, corner.y);
    cornerStatus.push(isOccupied);
    
    console.log(`角落${index} (${corner.x}, ${corner.y}): ${isOccupied ? '占用' : '空闲'}`);
    
    if (isOccupied) {
      occupiedCorners++;
      // 检查是否为前角
      if (cornerData.frontCorners.includes(index)) {
        frontCornersOccupied++;
      }
    }
  });
  
  console.log(`占用角落总数: ${occupiedCorners}/4`);
  console.log(`前角占用数: ${frontCornersOccupied}/${cornerData.frontCorners.length}`);
  console.log(`前角索引: [${cornerData.frontCorners.join(', ')}]`);
  console.log(`后角索引: [${cornerData.backCorners.join(', ')}]`);
  
  // T-Spin判定：至少3个角被占用
  if (occupiedCorners >= 3) {
    // Mini T-Spin判定条件：
    // 1. 前角占用数少于2个 AND
    // 2. 必须有踢墙发生
    const isMini = frontCornersOccupied < 2 && wasKicked;
    
    const result: TSpin = {
      type: isMini ? 'Mini T-Spin' : 'T-Spin',
      isMini
    };
    
    console.log(`✅ T-Spin检测成功: ${result.type}`);
    console.log(`判定依据: 占用角落=${occupiedCorners}, 前角占用=${frontCornersOccupied}, 踢墙=${wasKicked}`);
    console.log(`=== T-Spin检测结束 ===`);
    
    return result;
  }
  
  console.log(`❌ T-Spin检测失败: 占用角落不足3个 (当前: ${occupiedCorners})`);
  console.log(`=== T-Spin检测结束 ===`);
  
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
