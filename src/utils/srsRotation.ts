
import type { GamePiece } from './gameTypes';
import { isValidPosition } from './tetrisCore';

// 标准SRS踢墙系统 - 基于Hard Drop Wiki
// 参考: https://harddrop.com/wiki/SRS
export const getKickTests = (pieceType: string, rotation: number, newRotation: number): { x: number; y: number }[] => {
  const from = rotation % 4;
  const to = newRotation % 4;
  
  // 确定旋转方向和踢墙表索引
  let idx = 0;
  
  // 顺时针旋转 (0->1, 1->2, 2->3, 3->0)
  if ((from === 0 && to === 1) || (from === 1 && to === 2) || 
      (from === 2 && to === 3) || (from === 3 && to === 0)) {
    if (from === 0 && to === 1) idx = 0; // 0->R
    else if (from === 1 && to === 2) idx = 1; // R->2
    else if (from === 2 && to === 3) idx = 2; // 2->L
    else if (from === 3 && to === 0) idx = 3; // L->0
  }
  // 逆时针旋转 (0->3, 3->2, 2->1, 1->0)
  else {
    if (from === 1 && to === 0) idx = 4; // R->0
    else if (from === 2 && to === 1) idx = 5; // 2->R
    else if (from === 3 && to === 2) idx = 6; // L->2
    else if (from === 0 && to === 3) idx = 7; // 0->L
  }
  
  if (pieceType === 'I') {
    return SRS_I_KICK_TABLE[idx] || [{ x: 0, y: 0 }];
  } else if (pieceType === 'O') {
    return [{ x: 0, y: 0 }]; // O块不需要踢墙
  } else {
    return SRS_KICK_TABLE[idx] || [{ x: 0, y: 0 }];
  }
};

// SRS标准踢墙表 - 基于 https://harddrop.com/wiki/SRS
// 注意：Y轴已反转以匹配游戏板坐标系（Y向下为正）
const SRS_KICK_TABLE = [
  // Clockwise
  [ { x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 } ], // 0->R
  [ { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 } ],   // R->2
  [ { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 } ],   // 2->L
  [ { x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 } ], // L->0
  // Counter-clockwise
  [ { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 } ],   // R->0
  [ { x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 } ], // 2->R
  [ { x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 } ], // L->2
  [ { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 } ]    // 0->L
];

const SRS_I_KICK_TABLE = [
  // Clockwise (Y轴已反转)
  [ { x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 1 }, { x: 1, y: -2 } ],   // 0->R
  [ { x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: -2 }, { x: 2, y: 1 } ],   // R->2
  [ { x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: -1 }, { x: -1, y: 2 } ],   // 2->L
  [ { x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 2 }, { x: -2, y: -1 } ],   // L->0
  // Counter-clockwise (Y轴已反转)
  [ { x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: -1 }, { x: -1, y: 2 } ],   // R->0
  [ { x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 2 }, { x: -2, y: -1 } ],   // 2->R
  [ { x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 1 }, { x: 1, y: -2 } ],   // L->2
  [ { x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: -2 }, { x: 2, y: 1 } ]    // 0->L
];

// 改进的SRS踢墙测试，返回踢墙状态
// ✅ 修复：只更新 rotation，不修改 type.shape
export const performSRSRotation = (
  board: number[][],
  piece: GamePiece,
  clockwise: boolean = true
): { success: boolean; newPiece: GamePiece | null; wasKicked: boolean } => {
  // ✅ 不再调用 rotatePiece，保持 type 不变
  const newRotation = clockwise 
    ? (piece.rotation + 1) % 4 
    : (piece.rotation + 3) % 4;
  
  // 获取SRS踢墙测试序列
  const kickTests = getKickTests(
    piece.type.type,
    piece.rotation,
    newRotation
  );
  
  // 按照SRS规则测试每个踢墙位置
  for (let i = 0; i < kickTests.length; i++) {
    const kick = kickTests[i];
    const testPiece: GamePiece = {
      ...piece,
      type: piece.type,  // ✅ 保持原始 type 不变
      x: piece.x + kick.x,
      y: piece.y + kick.y,
      rotation: newRotation  // ✅ 只更新 rotation 值
    };
    
    if (isValidPosition(board, testPiece)) {
      const wasKicked = i > 0;
      return {
        success: true,
        newPiece: testPiece,
        wasKicked
      };
    }
  }
  
  return {
    success: false,
    newPiece: null,
    wasKicked: false
  };
};

// 180度旋转的SRS测试
// ✅ 修复：只更新 rotation，不修改 type.shape
export const performSRS180Rotation = (
  board: number[][],
  piece: GamePiece
): { success: boolean; newPiece: GamePiece | null; wasKicked: boolean } => {
  // ✅ 不再调用 rotatePiece，保持 type 不变
  const newRotation = (piece.rotation + 2) % 4;
  
  // 获取180度旋转的踢墙测试序列
  const kickTests = get180KickTests(piece.type.type, piece.rotation);
  
  for (let i = 0; i < kickTests.length; i++) {
    const kick = kickTests[i];
    const testPiece: GamePiece = {
      ...piece,
      type: piece.type,  // ✅ 保持原始 type 不变
      x: piece.x + kick.x,
      y: piece.y + kick.y,
      rotation: newRotation  // ✅ 只更新 rotation 值
    };
    
    if (isValidPosition(board, testPiece)) {
      const wasKicked = i > 0;
      return {
        success: true,
        newPiece: testPiece,
        wasKicked
      };
    }
  }
  
  return {
    success: false,
    newPiece: null,
    wasKicked: false
  };
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
