
import type { GamePiece } from './gameTypes';

// 标准SRS T-Spin检测系统
export interface TSpin {
  type: 'T-Spin' | 'Mini T-Spin';
  isMini: boolean;
}

// T块在SRS标准下的旋转状态和角落定义
const T_PIECE_CORNERS = {
  // 0度 (North) - T块朝上
  0: {
    frontCorners: [0, 1], // 上方两个角落
    backCorners: [2, 3]   // 下方两个角落
  },
  // 90度 (East) - T块朝右  
  1: {
    frontCorners: [1, 3], // 右方两个角落
    backCorners: [0, 2]   // 左方两个角落
  },
  // 180度 (South) - T块朝下
  2: {
    frontCorners: [2, 3], // 下方两个角落
    backCorners: [0, 1]   // 上方两个角落
  },
  // 270度 (West) - T块朝左
  3: {
    frontCorners: [0, 2], // 左方两个角落
    backCorners: [1, 3]   // 右方两个角落
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

// 获取T块中心位置的四个角落坐标
const getTCorners = (piece: GamePiece): { x: number; y: number }[] => {
  const centerX = piece.x + 1; // T块的中心在形状的(1,1)位置
  const centerY = piece.y + 1;
  
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
  
  // T-Spin判定：至少3个角被占用
  if (occupiedCorners >= 3) {
    // Mini T-Spin判定：前角占用数为0或1个，且必须有踢墙
    const isMini = frontCornersOccupied <= 1 && wasKicked;
    
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
  console.log('当前T块周围状态:');
  
  const corners = getTCorners(piece);
  corners.forEach((corner, index) => {
    const isOccupied = isPositionOccupied(board, corner.x, corner.y);
    console.log(`角落${index} (${corner.x}, ${corner.y}): ${isOccupied ? '占用' : '空闲'}`);
  });
};
