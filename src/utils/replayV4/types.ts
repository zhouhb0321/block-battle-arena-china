/**
 * Replay V4 Format - Placement-driven with Keyframes
 * Designed for reliability: every replay must have LOCK events + keyframes
 */

// Event opcodes
export enum ReplayOpcode {
  SPAWN = 0x01,    // Piece spawned
  INPUT = 0x02,    // User input (for animation)
  LOCK = 0x03,     // Piece locked (critical)
  KF = 0x04,       // Keyframe (board snapshot)
  META = 0x05,     // Metadata event
  FRAME = 0x06,    // Frame-level position sampling (Solution B)
  END = 0xFF       // Game end
}

// Input action types
export enum InputAction {
  MOVE_LEFT = 0x10,
  MOVE_RIGHT = 0x11,
  SOFT_DROP = 0x12,
  HARD_DROP = 0x13,
  ROTATE_CW = 0x14,
  ROTATE_CCW = 0x15,
  ROTATE_180 = 0x16,
  HOLD = 0x17
}

// V4 Event structures
export interface V4SpawnEvent {
  type: ReplayOpcode.SPAWN;
  timestamp: number;
  pieceType: string;  // "I", "O", "T", etc.
  x: number;
  y: number;
}

export interface V4InputEvent {
  type: ReplayOpcode.INPUT;
  timestamp: number;
  action: InputAction;
  success: boolean;  // Whether the input actually did something
  // ✅ P1 新增：位置和旋转信息（用于流畅动画）
  position?: { x: number; y: number };
  rotation?: number;
}

export interface V4LockEvent {
  type: ReplayOpcode.LOCK;
  timestamp: number;
  x: number;
  y: number;
  rotation: number;
  pieceType: string;
  linesCleared: number;
  isTSpin: boolean;
  isMini: boolean;
}

export interface V4KeyframeEvent {
  type: ReplayOpcode.KF;
  timestamp: number;
  board: number[][];
  nextPieces: string[];
  holdPiece: string | null;
  score: number;
  lines: number;
  level: number;
}

export interface V4MetaEvent {
  type: ReplayOpcode.META;
  timestamp: number;
  key: string;
  value: any;
}

export interface V4EndEvent {
  type: ReplayOpcode.END;
  timestamp: number;
  reason: 'complete' | 'gameover' | 'quit';
}

// 帧级位置采样事件 (Solution B: Frame-level Input Sampling)
export interface V4FrameEvent {
  type: ReplayOpcode.FRAME;
  timestamp: number;
  x: number;          // 方块 X 位置
  y: number;          // 方块 Y 位置
  rotation: number;   // 方块旋转状态
  pieceType: string;  // 当前方块类型
}

export type V4Event = 
  | V4SpawnEvent 
  | V4InputEvent 
  | V4LockEvent 
  | V4KeyframeEvent 
  | V4MetaEvent 
  | V4EndEvent
  | V4FrameEvent;

// V4 Replay container
export interface V4ReplayData {
  version: '4.0';
  
  // Header metadata
  metadata: {
    userId: string;
    username: string;
    gameMode: string;
    seed: string;
    initialPieceSequence?: string[];  // Full piece sequence (optional for backward compatibility)
    recordedAt: string;  // ISO timestamp
    settings: {
      das: number;
      arr: number;
      sdf: number;
    };
  };
  
  // Events array
  events: V4Event[];
  
  // Final stats (for quick access)
  stats: {
    finalScore: number;
    finalLines: number;
    finalLevel: number;
    duration: number;  // milliseconds
    pps: number;
    apm: number;
    lockCount: number;
    keyframeCount: number;
  };
  
  // Data integrity
  checksum: string;
}

// Binary format structure
export interface V4BinaryFormat {
  magic: Uint8Array;     // "RPV4" (4 bytes)
  version: number;       // 4 (1 byte)
  headerSize: number;    // varint
  header: Uint8Array;    // JSON metadata
  eventCount: number;    // varint
  events: Uint8Array;    // Compressed event blocks
  checksum: Uint8Array;  // SHA-256 hash (32 bytes)
}

// Validation result
export interface V4ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalEvents: number;
    spawnCount: number;
    inputCount: number;
    lockCount: number;
    keyframeCount: number;
    frameCount: number;  // 帧级采样事件数量
  };
}
