
import type { GamePiece } from './gameTypes';

// T-Spin检测系统 - 基于标准SRS规则的精确实现
export interface TSpin {
  type: 'T-Spin' | 'Mini T-Spin';
  isMini: boolean;
}

// T块在不同旋转状态下的角落位置映射（相对于T块的中心点）
const T_PIECE_CORNERS = {
  // 0度 - T块朝上 ┴
  0: {
    corners: [
      { dx: -1, dy: -1 }, // 左上角
      { dx: 1, dy: -1 },  // 右上角
      { dx: -1, dy: 1 },  // 左下角
      { dx: 1, dy: 1 }    // 右下角
    ],
    frontCorners: [0, 1], // 前角是上方两个角
    center: { dx: 0, dy: 0 } // T块中心点
  },
  // 90度 - T块朝右 ├
  1: {
    corners: [
      { dx: -1, dy: -1 }, // 左上角
      { dx: 1, dy: -1 },  // 右上角
      { dx: -1, dy: 1 },  // 左下角
      { dx: 1, dy: 1 }    // 右下角
    ],
    frontCorners: [1, 3], // 前角是右方两个角
    center: { dx: 0, dy: 0 }
  },
  // 180度 - T块朝下 ┬
  2: {
    corners: [
      { dx: -1, dy: -1 }, // 左上角
      { dx: 1, dy: -1 },  // 右上角
      { dx: -1, dy: 1 },  // 左下角
      { dx: 1, dy: 1 }    // 右下角
    ],
    frontCorners: [2, 3], // 前角是下方两个角
    center: { dx: 0, dy: 0 }
  },
  // 270度 - T块朝左 ┤
  3: {
    corners: [
      { dx: -1, dy: -1 }, // 左上角
      { dx: 1, dy: -1 },  // 右上角
      { dx: -1, dy: 1 },  // 左下角
      { dx: 1, dy: 1 }    // 右下角
    ],
    frontCorners: [0, 2], // 前角是左方两个角
    center: { dx: 0, dy: 0 }
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
  const tConfig = T_PIECE_CORNERS[rotation as keyof typeof T_PIECE_CORNERS];
  
  // T块的实际中心位置（在3x3网格中，T块中心通常在(1,1)位置）
  const centerX = piece.x + 1;
  const centerY = piece.y + 1;
  
  let occupiedCorners = 0;
  let frontCornersOccupied = 0;
  
  console.log(`T-Spin检测: 位置(${centerX}, ${centerY}), 旋转${rotation}度`);
  
  // 检查四个角落
  tConfig.corners.forEach((corner, index) => {
    const checkX = centerX + corner.dx;
    const checkY = centerY + corner.dy;
    
    // 检查这个角落是否被占用（包括边界）
    const isOccupied = checkX < 0 || checkX >= 10 || 
                      checkY < 0 || checkY >= board.length || 
                      board[checkY][checkX] !== 0;
    
    console.log(`角落${index} (${checkX}, ${checkY}): ${isOccupied ? '占用' : '空'}`);
    
    if (isOccupied) {
      occupiedCorners++;
      if (tConfig.frontCorners.includes(index)) {
        frontCornersOccupied++;
      }
    }
  });
  
  console.log(`占用角落: ${occupiedCorners}/4, 前角占用: ${frontCornersOccupied}/${tConfig.frontCorners.length}`);
  
  // T-Spin判定：至少3个角被占用
  if (occupiedCorners >= 3) {
    // Mini T-Spin判定：只有1个或0个前角被占用
    const isMini = frontCornersOccupied <= 1;
    
    console.log(`T-Spin检测成功: ${isMini ? 'Mini ' : ''}T-Spin`);
    
    return {
      type: isMini ? 'Mini T-Spin' : 'T-Spin',
      isMini
    };
  }
  
  console.log('T-Spin检测失败: 占用角落不足');
  return null;
};
