
import type { GamePiece } from './gameTypes';
import { rotatePiece as rotatePieceShape } from './pieceGeneration';
import { isValidPosition } from './tetrisCore';

// Export the rotatePiece function for use in other modules
export { rotatePiece } from './pieceGeneration';

// SRS标准旋转中心点（以左上角为(0,0)）
// I: (1.5, 0.5)  O: (0.5, 0.5)  其它: (1,1)
// rotatePiece需以此为基准旋转
export const getKickTests = (pieceType: string, rotation: number, newRotation: number): { x: number; y: number }[] => {
  // SRS规定：0->R(1), R->2(2), 2->L(3), L->0(0)
  const from = rotation % 4;
  const to = newRotation % 4;
  let idx = 0;
  if (from === 0 && to === 1) idx = 0;
  else if (from === 1 && to === 2) idx = 1;
  else if (from === 2 && to === 3) idx = 2;
  else if (from === 3 && to === 0) idx = 3;
  else if (from === 1 && to === 0) idx = 1;
  else if (from === 2 && to === 1) idx = 2;
  else if (from === 3 && to === 2) idx = 3;
  else if (from === 0 && to === 3) idx = 0;
  if (pieceType === 'I') {
    return SRS_I_KICK_TABLE[idx];
  } else if (pieceType === 'O') {
    return [{ x: 0, y: 0 }];
  } else {
    return SRS_KICK_TABLE[idx];
  }
};

// SRS标准踢墙表（严格对齐Hard Drop Wiki）
const SRS_KICK_TABLE = [
  // 0->R, R->2, 2->L, L->0
  [ { x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 } ],
  [ { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 } ],
  [ { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 } ],
  [ { x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 } ]
];

const SRS_I_KICK_TABLE = [
  // 0->R, R->2, 2->L, L->0
  [ { x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: -1 }, { x: 1, y: 2 } ],
  [ { x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 1 }, { x: -1, y: -2 } ],
  [ { x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 1 }, { x: -1, y: -2 } ],
  [ { x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: -1 }, { x: 1, y: 2 } ]
];

// 改进的SRS踢墙测试，返回踢墙状态
export const performSRSRotation = (
  board: number[][],
  piece: GamePiece,
  clockwise: boolean = true
): { success: boolean; newPiece: GamePiece | null; wasKicked: boolean } => {
  const rotated = rotatePieceShape(piece.type, clockwise);
  const newRotation = clockwise 
    ? (piece.rotation + 1) % 4 
    : (piece.rotation + 3) % 4;
  
  // 获取SRS踢墙测试序列
  const kickTests = getKickTests(
    piece.type.type,
    piece.rotation,
    newRotation
  );
  
  console.log(`SRS旋转测试开始: ${piece.type.type}块 ${piece.rotation}->${newRotation}`);
  
  // 按照SRS规则测试每个踢墙位置
  for (let i = 0; i < kickTests.length; i++) {
    const kick = kickTests[i];
    const testPiece: GamePiece = {
      ...piece,
      type: rotated,
      x: piece.x + kick.x,
      y: piece.y + kick.y,
      rotation: newRotation
    };
    
    console.log(`踢墙测试 ${i}: 偏移(${kick.x}, ${kick.y}) -> 位置(${testPiece.x}, ${testPiece.y})`);
    
    if (isValidPosition(board, testPiece)) {
      const wasKicked = i > 0;
      console.log(`✅ 旋转成功! ${wasKicked ? '踢墙成功' : '原地旋转'}`);
      
      return {
        success: true,
        newPiece: testPiece,
        wasKicked
      };
    }
  }
  
  console.log(`❌ 旋转失败: 所有踢墙测试都无效`);
  return {
    success: false,
    newPiece: null,
    wasKicked: false
  };
};

// 180度旋转的SRS测试
export const performSRS180Rotation = (
  board: number[][],
  piece: GamePiece
): { success: boolean; newPiece: GamePiece | null; wasKicked: boolean } => {
  const rotated = rotatePieceShape(rotatePieceShape(piece.type, true), true); // 旋转两次
  const newRotation = (piece.rotation + 2) % 4;
  
  // 获取180度旋转的踢墙测试序列
  const kickTests = get180KickTests(piece.type.type, piece.rotation);
  
  console.log(`SRS 180度旋转测试开始: ${piece.type.type}块`);
  
  for (let i = 0; i < kickTests.length; i++) {
    const kick = kickTests[i];
    const testPiece: GamePiece = {
      ...piece,
      type: rotated,
      x: piece.x + kick.x,
      y: piece.y + kick.y,
      rotation: newRotation
    };
    
    if (isValidPosition(board, testPiece)) {
      const wasKicked = i > 0;
      console.log(`✅ 180度旋转成功! ${wasKicked ? '踢墙成功' : '原地旋转'}`);
      
      return {
        success: true,
        newPiece: testPiece,
        wasKicked
      };
    }
  }
  
  console.log(`❌ 180度旋转失败`);
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
