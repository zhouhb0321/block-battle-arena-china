
import type { GamePiece } from './gameTypes';

// 标准SRS T-Spin检测系统
export interface TSpin {
  type: 'T-Spin' | 'Mini T-Spin';
  isMini: boolean;
}

// T块在SRS标准下的旋转中心和角落检测
// T块形状在不同旋转状态下的标准定义
const T_PIECE_SRS_DATA = {
  // 0度 (North) - T块朝上 ┴
  0: {
    // T块占用: [[0,1,0], [1,1,1]] 中心在(1,1)
    center: { x: 1, y: 1 },
    corners: [
      { x: 0, y: 0 }, // 左上角
      { x: 2, y: 0 }, // 右上角
      { x: 0, y: 2 }, // 左下角
      { x: 2, y: 2 }  // 右下角
    ],
    frontCorners: [0, 1] // 朝向方向的角落索引 (上方)
  },
  // 90度 (East) - T块朝右 ├
  1: {
    center: { x: 1, y: 1 },
    corners: [
      { x: 0, y: 0 }, // 左上角
      { x: 2, y: 0 }, // 右上角
      { x: 0, y: 2 }, // 左下角
      { x: 2, y: 2 }  // 右下角
    ],
    frontCorners: [1, 3] // 朝向方向的角落索引 (右方)
  },
  // 180度 (South) - T块朝下 ┬
  2: {
    center: { x: 1, y: 1 },
    corners: [
      { x: 0, y: 0 }, // 左上角
      { x: 2, y: 0 }, // 右上角
      { x: 0, y: 2 }, // 左下角
      { x: 2, y: 2 }  // 右下角
    ],
    frontCorners: [2, 3] // 朝向方向的角落索引 (下方)
  },
  // 270度 (West) - T块朝左 ┤
  3: {
    center: { x: 1, y: 1 },
    corners: [
      { x: 0, y: 0 }, // 左上角
      { x: 2, y: 0 }, // 右上角
      { x: 0, y: 2 }, // 左下角
      { x: 2, y: 2 }  // 右下角
    ],
    frontCorners: [0, 2] // 朝向方向的角落索引 (左方)
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
  const tData = T_PIECE_SRS_DATA[rotation as keyof typeof T_PIECE_SRS_DATA];
  
  // 计算T块的实际中心位置（基于piece位置和SRS中心偏移）
  const actualCenterX = piece.x + tData.center.x;
  const actualCenterY = piece.y + tData.center.y;
  
  console.log(`=== T-Spin检测开始 ===`);
  console.log(`T块位置: (${piece.x}, ${piece.y}), 旋转: ${rotation * 90}度`);
  console.log(`实际中心: (${actualCenterX}, ${actualCenterY})`);
  console.log(`最后动作: ${lastMove}, 是否踢墙: ${wasKicked}`);
  
  let occupiedCorners = 0;
  let frontCornersOccupied = 0;
  const cornerStatus: boolean[] = [];
  
  // 检查四个角落
  tData.corners.forEach((corner, index) => {
    const checkX = actualCenterX + corner.x - 1; // 减1因为corner是相对于3x3网格的
    const checkY = actualCenterY + corner.y - 1;
    
    const isOccupied = isPositionOccupied(board, checkX, checkY);
    cornerStatus.push(isOccupied);
    
    console.log(`角落${index} (${checkX}, ${checkY}): ${isOccupied ? '占用' : '空闲'}`);
    
    if (isOccupied) {
      occupiedCorners++;
      // 检查是否为前角
      if (tData.frontCorners.includes(index)) {
        frontCornersOccupied++;
      }
    }
  });
  
  console.log(`占用角落总数: ${occupiedCorners}/4`);
  console.log(`前角占用数: ${frontCornersOccupied}/${tData.frontCorners.length}`);
  
  // T-Spin判定：至少3个角被占用
  if (occupiedCorners >= 3) {
    // Mini T-Spin判定：前角占用数量少于等于1个
    const isMini = frontCornersOccupied <= 1;
    
    const result: TSpin = {
      type: isMini ? 'Mini T-Spin' : 'T-Spin',
      isMini
    };
    
    console.log(`✅ T-Spin检测成功: ${result.type}`);
    console.log(`=== T-Spin检测结束 ===`);
    
    return result;
  }
  
  console.log(`❌ T-Spin检测失败: 占用角落不足3个`);
  console.log(`=== T-Spin检测结束 ===`);
  
  return null;
};

// 用于调试的辅助函数
export const debugTSpinSetup = (board: number[][], piece: GamePiece): void => {
  if (piece.type.type !== 'T') return;
  
  console.log('=== T-Spin调试信息 ===');
  console.log('当前棋盘状态（T块周围）:');
  
  const rotation = piece.rotation % 4;
  const tData = T_PIECE_SRS_DATA[rotation as keyof typeof T_PIECE_SRS_DATA];
  const actualCenterX = piece.x + tData.center.x;
  const actualCenterY = piece.y + tData.center.y;
  
  // 显示3x3区域的状态
  for (let dy = -1; dy <= 1; dy++) {
    let row = '';
    for (let dx = -1; dx <= 1; dx++) {
      const x = actualCenterX + dx;
      const y = actualCenterY + dy;
      const isOccupied = isPositionOccupied(board, x, y);
      row += isOccupied ? '■' : '□';
    }
    console.log(row);
  }
  
  console.log('角落位置标记：');
  tData.corners.forEach((corner, index) => {
    const checkX = actualCenterX + corner.x - 1;
    const checkY = actualCenterY + corner.y - 1;
    const isFront = tData.frontCorners.includes(index);
    console.log(`角落${index} (${checkX}, ${checkY}): ${isFront ? '前角' : '后角'}`);
  });
};
