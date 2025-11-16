import { V4ReplayData, V4InputEvent, ReplayOpcode, InputAction } from './types';

/**
 * 将 V4 INPUT 事件转换为游戏引擎可理解的动作类型
 */
export function convertInputActionToString(action: InputAction): string | null {
  const actionMap: Record<InputAction, string> = {
    [InputAction.MOVE_LEFT]: 'moveLeft',
    [InputAction.MOVE_RIGHT]: 'moveRight',
    [InputAction.SOFT_DROP]: 'softDrop',
    [InputAction.HARD_DROP]: 'hardDrop',
    [InputAction.ROTATE_CW]: 'rotateClockwise',
    [InputAction.ROTATE_CCW]: 'rotateCounterclockwise',
    [InputAction.ROTATE_180]: 'rotate180',
    [InputAction.HOLD]: 'hold'
  };
  
  return actionMap[action] || null;
}

/**
 * 从 V4 回放中提取所有 INPUT 事件（用于驱动游戏引擎）
 */
export function extractInputEvents(replay: V4ReplayData): Array<{
  timestamp: number;
  action: string;
  success: boolean;
  position?: { x: number; y: number };
  rotation?: number;
}> {
  if (!replay || !Array.isArray(replay.events)) {
    console.warn('[Converter] Invalid replay data for input events');
    return [];
  }
  return replay.events
    .filter((e): e is V4InputEvent => e && e.type === ReplayOpcode.INPUT)
    .map(event => {
      const actionString = convertInputActionToString(event.action);
      if (!actionString) return null;
      
      return {
        timestamp: event.timestamp,
        action: actionString,
        success: event.success,
        position: event.position,
        rotation: event.rotation
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);
}

/**
 * 从 V4 回放中提取 LOCK 事件
 */
export function extractLockEvents(replay: V4ReplayData) {
  if (!replay || !Array.isArray(replay.events)) {
    console.warn('[Converter] Invalid replay data for lock events');
    return [];
  }
  return replay.events
    .filter((e): e is import('./types').V4LockEvent => e && e.type === ReplayOpcode.LOCK);
}

/**
 * 从 V4 回放中提取 KEYFRAME 事件
 */
export function extractKeyframeEvents(replay: V4ReplayData) {
  if (!replay || !Array.isArray(replay.events)) {
    console.warn('[Converter] Invalid replay data for keyframe events');
    return [];
  }
  return replay.events
    .filter((e): e is import('./types').V4KeyframeEvent => e && e.type === ReplayOpcode.KF);
}

/**
 * 从 V4 回放中提取元数据
 */
export function extractReplayMetadata(replay: V4ReplayData) {
  // 安全提取元数据，添加默认值
  const metadata = replay?.metadata as V4ReplayData['metadata'] | undefined;
  if (!metadata) {
    console.warn('[Converter] Missing replay metadata, using defaults');
    return {
      userId: 'unknown',
      username: 'Unknown Player',
      gameMode: 'classic',
      seed: Math.random().toString(36),
      initialPieceSequence: [],
      recordedAt: new Date().toISOString(),
      settings: { das: 100, arr: 10, sdf: 500 }
    };
  }
  return {
    userId: metadata.userId || 'unknown',
    username: metadata.username || 'Unknown Player',
    gameMode: metadata.gameMode || 'classic',
    seed: metadata.seed || Math.random().toString(36),
    initialPieceSequence: Array.isArray(metadata.initialPieceSequence) ? metadata.initialPieceSequence : [],
    recordedAt: metadata.recordedAt || new Date().toISOString(),
    settings: metadata.settings || { das: 100, arr: 10, sdf: 500 }
  };
}
