
import type { GamePiece } from './gameTypes';

// 精确的T-Spin检测系统 - 基于T块实际形状的角落检测
export interface TSpin {
  type: 'T-Spin' | 'Mini T-Spin';
  isMini: boolean;
}

// T块在不同旋转状态下的精确角落位置（基于T块的实际占用格子）
const T_PIECE_CORNER_DETECTION = {
  // 0度 - T块朝上 ┴ 
  0: {
    // T块形状: [[0,1,0], [1,1,1]]
    // 中心点在 (1,1)，检查四个对角位置
    corners: [
      { dx: -1, dy: -1 }, // 左上
      { dx: 1, dy: -1 },  // 右上  
      { dx: -1, dy: 1 },  // 左下
      { dx: 1, dy: 1 }    // 右下
    ],
    frontCorners: [0, 1] // 朝向方向的角落（上方）
  },
  // 90度 - T块朝右 ├
  1: {
    corners: [
      { dx: -1, dy: -1 }, // 左上
      { dx: 1, dy: -1 },  // 右上
      { dx: -1, dy: 1 },  // 左下  
      { dx: 1, dy: 1 }    // 右下
    ],
    frontCorners: [1, 3] // 朝向方向的角落（右方）
  },
  // 180度 - T块朝下 ┬
  2: {
    corners: [
      { dx: -1, dy: -1 }, // 左上
      { dx: 1, dy: -1 },  // 右上
      { dx: -1, dy: 1 },  // 左下
      { dx: 1, dy: 1 }    // 右下  
    ],
    frontCorners: [2, 3] // 朝向方向的角落（下方）
  },
  // 270度 - T块朝左 ┤
  3: {
    corners: [
      { dx: -1, dy: -1 }, // 左上
      { dx: 1, dy: -1 },  // 右上
      { dx: -1, dy: 1 },  // 左下
      { dx: 1, dy: 1 }    // 右下
    ],
    frontCorners: [0, 2] // 朝向方向的角落（左方）
  }
};

// 精确的T-Spin检测函数
export const detectTSpin = (
  board: number[][],
  piece: GamePiece,
  lastMove: string
): TSpin | null => {
  // 只检测T块
  if (piece.type.type !== 'T') {
    return null;
  }

  // 只有旋转后才能触发T-Spin
  if (lastMove !== 'rotate') {
    return null;
  }

  const rotation = piece.rotation % 4;
  const tConfig = T_PIECE_CORNER_DETECTION[rotation as keyof typeof T_PIECE_CORNER_DETECTION];
  
  // T块的中心位置（基于T块形状 [[0,1,0], [1,1,1]]，中心在第二行第二列）
  const centerX = piece.x + 1;
  const centerY = piece.y + 1;
  
  let occupiedCorners = 0;
  let frontCornersOccupied = 0;
  
  console.log(`T-Spin检测开始: 位置(${centerX}, ${centerY}), 旋转${rotation * 90}度`);
  
  // 检查四个角落是否被占用
  tConfig.corners.forEach((corner, index) => {
    const checkX = centerX + corner.dx;
    const checkY = centerY + corner.dy;
    
    // 检查这个角落是否被占用（包括超出边界的情况）
    const isOccupied = checkX < 0 || checkX >= 10 || 
                      checkY < 0 || checkY >= board.length || 
                      (checkX >= 0 && checkX < 10 && checkY >= 0 && checkY < board.length && board[checkY][checkX] !== 0);
    
    console.log(`角落${index} (${checkX}, ${checkY}): ${isOccupied ? '占用' : '空闲'}`);
    
    if (isOccupied) {
      occupiedCorners++;
      if (tConfig.frontCorners.includes(index)) {
        frontCornersOccupied++;
      }
    }
  });
  
  console.log(`占用角落总数: ${occupiedCorners}/4, 前方角落占用: ${frontCornersOccupied}/${tConfig.frontCorners.length}`);
  
  // 标准T-Spin判定：至少3个角被占用
  if (occupiedCorners >= 3) {
    // Mini T-Spin判定：前方角落占用数量 <= 1
    const isMini = frontCornersOccupied <= 1;
    
    console.log(`T-Spin检测成功: ${isMini ? 'Mini ' : ''}T-Spin`);
    
    return {
      type: isMini ? 'Mini T-Spin' : 'T-Spin',
      isMini
    };
  }
  
  console.log('T-Spin检测失败: 占用角落数量不足');
  return null;
};
